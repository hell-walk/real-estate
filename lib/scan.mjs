// "Scan a piece": a photograph of something the visitor owns comes in, Claude looks at it and answers with what it is,
// how big it is likely to be, and its colour, as strict JSON; the flat viewer then builds a block of that size and
// colour, with the photograph on its front, and lets the visitor put it in the rooms. Needs ANTHROPIC_API_KEY on the
// server and the SDK from `npm install`; without either the endpoint says so and the viewer keeps its catalogue.

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'category', 'width_cm', 'depth_cm', 'height_cm', 'colour_hex', 'material', 'confidence', 'note'],
  properties: {
    name: { type: 'string', description: 'A short name for the piece, as a shop would list it, e.g. "three seat fabric sofa"' },
    category: { type: 'string', enum: ['bed', 'sofa', 'armchair', 'table', 'chair', 'wardrobe', 'shelf', 'desk', 'tv', 'fridge', 'appliance', 'plant', 'lamp', 'rug', 'other'] },
    width_cm: { type: 'number', description: 'Width as seen from the front, in centimetres' },
    depth_cm: { type: 'number', description: 'Front to back, in centimetres' },
    height_cm: { type: 'number', description: 'Floor to top, in centimetres' },
    colour_hex: { type: 'string', description: 'The main colour as a six digit hex code with a leading #' },
    material: { type: 'string', description: 'The main material in a word or two' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'], description: 'How sure the size estimate is' },
    note: { type: 'string', description: 'One short sentence on what the size was judged from, or what to check' },
  },
};

const SYSTEM = 'You help a visitor furnish a flat in a 3D viewer. They photograph a piece of furniture or an appliance they own. Identify it and estimate its real size in centimetres from the picture, using anything in frame for scale (a door is about 210 cm tall, a standard tile 60 cm, a sofa seat 45 cm high, a dining table 75 cm high, a switch plate 120 cm off the floor). Give the dominant colour as a hex code. If the picture shows no furniture or appliance, name what it shows, set category to other, give a plausible size, and say in the note that it is not furniture. Answer only with the JSON the schema asks for.';

const clampDim = (v) => Math.min(400, Math.max(10, Math.round(Number(v) || 60)));

export async function scanItem(input) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(input?.image || ''));
  if (!m) return { status: 400, body: { ok: false, error: 'Send a JPEG, PNG or WebP picture as a data URL in "image".' } };
  if (m[2].length > 3_600_000) return { status: 413, body: { ok: false, error: 'The picture is too big. The viewer sends them at 1024 pixels; try again.' } };
  if (!process.env.ANTHROPIC_API_KEY) return { status: 503, body: { ok: false, error: 'Scanning is switched off on this server. Set ANTHROPIC_API_KEY and start it again; the catalogue still works.' } };
  let Anthropic;
  try { ({ default: Anthropic } = await import('@anthropic-ai/sdk')); } catch { return { status: 503, body: { ok: false, error: 'The Claude SDK is not installed on this server. Run npm install and start it again.' } }; }

  const note = String(input.note || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200);
  const client = new Anthropic();
  try {
    const res = await client.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
          { type: 'text', text: note ? `The visitor says: "${note}". Identify the piece and estimate its size.` : 'Identify the piece and estimate its size.' },
        ],
      }],
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    });
    if (res.stop_reason === 'refusal') return { status: 422, body: { ok: false, error: 'Claude declined to read that picture. Try a plain photograph of the piece on its own.' } };
    const text = res.content.find((b) => b.type === 'text')?.text || '';
    let item;
    try { item = JSON.parse(text); } catch { return { status: 502, body: { ok: false, error: 'The answer did not parse. Try again.' } }; }
    const colour = /^#[0-9a-f]{6}$/i.test(item.colour_hex || '') ? item.colour_hex.toLowerCase() : '#8a7f72';
    const clean = {
      name: String(item.name || 'a piece').slice(0, 80), category: SCHEMA.properties.category.enum.includes(item.category) ? item.category : 'other',
      width_cm: clampDim(item.width_cm), depth_cm: clampDim(item.depth_cm), height_cm: clampDim(item.height_cm),
      colour_hex: colour, material: String(item.material || '').slice(0, 40), confidence: ['low', 'medium', 'high'].includes(item.confidence) ? item.confidence : 'low', note: String(item.note || '').slice(0, 200),
    };
    console.log(`[scan] ${clean.name} ${clean.width_cm}x${clean.depth_cm}x${clean.height_cm} cm, ${clean.confidence}`);
    return { status: 200, body: { ok: true, item: clean, usage: { input: res.usage?.input_tokens, output: res.usage?.output_tokens } } };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { status: 503, body: { ok: false, error: 'The server’s Claude key was not accepted.' } };
    if (err instanceof Anthropic.RateLimitError) return { status: 429, body: { ok: false, error: 'Too many scans at once. Wait a minute and try again.' } };
    if (err instanceof Anthropic.APIStatusError) { console.error('[scan]', err.status, err.message); return { status: 502, body: { ok: false, error: 'Claude could not read the picture just now. Try again.' } }; }
    if (err instanceof Anthropic.APIConnectionError) return { status: 502, body: { ok: false, error: 'The server could not reach Claude. Check its connection.' } };
    throw err;
  }
}
