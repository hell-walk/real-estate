# Fifteen UI and UX case studies from the Ratan Galaxy site

Each study records a design decision taken between 6 and 10 November 2026: the situation, the problem as it showed itself, what was tried, what was decided, the result, and the lesson a successor can reuse. The commits named are in the repository's history; the screenshots referred to were headless captures at 1440 and 375 pixels wide, read after every change.

## 1. Choosing a direction from a reference, not from habit

**Situation.** The site had already been through two looks: a warm-black "The place carries it" direction drawn from a design library, then a dark "notice board" where every section was a cream sheet taped to a board, after the author sent an Instagram reel of a paper-cutout construction site. On 7 November the author sent six Stitch design exports and asked for a critique.

**Problem.** Five of the six were competent and interchangeable: dark heroes, glass towers that were nobody's building, three feature cards, a gradient. The sixth, "Architectural Drafting Atelier", was light, cream, with a serif headline, yellow tags and slate-blue buttons, and used dark only as a frame. The author asked whether the site could look like that.

**What was done.** Rather than restyle by eye, the sixth export was read as a specification: its colours were measured and became tokens, its type (a serif display face over a grotesque) was matched with Newsreader over Cabinet Grotesk, its structure (split hero with a facts card, note band, dark three-column footer) was mapped onto the site's existing sections. The parts of the export that were wrong for the subject (an AI rendering of blue glass towers, an "artist's impression" caption) were dropped: the site's own 3D model is the picture. The patch was applied by a script that asserted every replacement matched exactly once, so nothing was silently missed.

**Result.** Commit `56e9f91`. The real facts and both 3D scenes were untouched; the page changed its clothes in one pass.

**Lesson.** A reference design is a list of decisions to adopt or reject one by one, with a reason written for each rejection. Taking the look while keeping the subject's own imagery is what made it the site's design rather than a template's.

## 2. The first screen answers the first question in large type

**Situation.** The earlier hero was a title over the 3D stage, with the figures in a strip below the fold.

**Problem.** A visitor who did not know Ratan Galaxy could scroll a full screen without learning how big it was, whether it was finished, or that it was real. The 3D stage, being dark and animated, drew the eye away from the words.

**What was done.** The hero became a split: on the left seven columns a tag ("Finished, and lived in"), a kicker with the location, a three-line serif headline ("Ratan Galaxy. 378 finished homes in Vrindavan Yojna."), one paragraph, two buttons; on the right four columns a paper facts card with plot, blocks, homes and finish dates and the two RERA numbers. The stage sits below, full width.

**Result.** At 1440 the whole proposition fits above the stage; at 375 the facts card stacks under the buttons, still before the stage.

**Lesson.** Put the answer to "what is this and is it real" in the largest type on the page, and keep the show-piece below it. The stage then rewards the visitor instead of having to explain the site.

## 3. The stage is a framed object, and dark is only the frame

**Situation.** In the notice-board look the whole page was dark. The atelier export used a light page with dark only around the picture.

**Problem.** A dark page makes a 3D scene look like a game; a light page with a floating canvas makes it look unanchored. The author's earlier request had been to put the model "inside a box".

**What was done.** The stage sits in a `.hero-card` board frame, near-black, with a bar above the picture (a title, or the browser-window dots and URL on the flat page) and yellow tape marks at the top corners, the one motif kept from the notice board. The same frame holds the flat viewer's model. Everywhere else the dark colour appears only in the menu panel and the footer.

**Result.** The picture reads as a model on a drafting table; the rest of the page reads as paper.

**Lesson.** Give an interactive picture a physical frame and a label bar. It tells the visitor where the interactive thing starts and stops, and it lets the page stay light.

## 4. Time of day: a slider nobody found, and three presets everybody does

**Situation.** The time-of-day control was a range slider in the stage's tool strip. It worked, and it drove the light, the window glow and the lamps.

**Problem.** In screenshots the slider was small, unlabelled from a distance, and indistinguishable from a progress bar. Nobody would know it was the best thing on the page.

**What was done.** Three preset buttons, Day, Evening and Dusk, went into the frame's bar, each setting the light to 15, 60 or 100 per cent and taking the pressed state in yellow. The slider stayed in the tools for fine control; moving it un-presses the buttons unless it lands within eight points of a preset. The implementation is a small addition to `hero3d.js` beside the slider's listener.

**Result.** The light change is one click and visible before the model has loaded.

**Lesson.** A continuous control needs a discrete face. Offer the three states people want as buttons, and keep the slider for the few who want more.

## 5. Loading a 3D page behind a card that tells the truth

**Situation.** Both 3D pages take two to eight seconds to build their scenes. Early on they showed a dark rectangle, then everything at once.

**Problem.** A blank stage for five seconds reads as broken, and a visitor without WebGL saw nothing at all.

**What was done.** `src/partials/loader.html` is a taped card over the stage with a drawn towers mark, a step line, a bar and a percentage. The hero reports real phases ("Laying the ground and the roads", "Raising the three blocks", "Waiting for the afternoon light"); the flat reports its model loads. Each page hides the card on its first rendered frame, on no WebGL (showing the fallback still instead) or on failure, and `site.js` removes any card after twenty seconds in case no script arrives.

**Result.** The wait became part of the page. The phases are true, so the bar never lies about progress.

**Lesson.** A loading state should name what is being built and have an exit for every failure path, including the one where the script never runs.

## 6. The pick card: a regression caught by screenshots, then a redesign

**Situation.** Clicking a flat on the towers opens a card naming it, its type, areas and sample price, with a link to the viewer and a form to find another flat.

**Problem.** After the notice-board restyle the card had fallen out of the stage and into the page flow below it. The cause was a stylesheet rule that gave every taped element `position: relative`, which swallowed the card's absolute positioning. The author noticed it as "fix the pick card's alignment".

**What was done.** The card was taken out of the tape rule and positioned over the stage again, checked at 1440, 820 and 375. In the later overview redesign (uncommitted at the time of writing) the card moved to the bottom left as a "Selected unit" card with the price and an "Enter spatial twin" link, and the find-a-flat form folds out of it.

**Result.** The card sits over the picture at every width.

**Lesson.** A broad selector rule can change the positioning context of something it was never meant to touch. Every visual change needs the three-width screenshot pass, because the regression was invisible in the code and obvious in the picture.

## 7. Walking out of a ninth-floor flat into the air

**Situation.** The flat viewer's walk mode lets you move through doors. Every door, including the front door, was an opening.

**Problem.** The author walked through the front door and stood in the air outside the flat, looking at a balcony with no railing. The report was "no railing".

**What was done.** The front door, the one door on an outer wall that is not a balcony's, is now drawn shut and left out of the walkable openings. The room labels on the picture became buttons: a click puts you in that room, and the rooms list in the panel uses the same function.

**Result.** The flat is a closed volume; you can reach every room with a click.

**Lesson.** First-person navigation needs a boundary the user cannot cross and a way to teleport that does not depend on the navigation itself. Labels that look like labels should do something when clicked.

## 8. The flat page: a picture that stays while the panel scrolls

**Situation.** The flat page is a 3D stage beside a long panel (facts, view toggle, rooms, furniture catalogue, the scan).

**Problem.** Scrolling the panel dragged the picture up and out of view, so a visitor choosing a sofa could not see the room.

**What was done.** On desktop the stage is sticky at the viewport height and the panel flows; on a phone the stage is a block above the panel. Later the stage took the same board frame as the home stage, with the bar naming the flat.

**Result.** The picture is always visible while you work in the panel on desktop; on a phone the order is picture first, then controls.

**Lesson.** When a page has a canvas and a control panel, pin the canvas. The panel is the thing that scrolls.

## 9. A map that said nothing, and a heading that said what it was for

**Situation.** The home and location pages had a dark drawn map stretched behind a list of distances.

**Problem.** The author called the pair pointless and ugly. Neither element had a heading; a visitor could not tell whether the list belonged to the map or what either was for.

**What was done.** The map was redrawn as a cream sketch of south Lucknow (the Gomti, Shaheed Path, the main roads, the railway, the parks, the stadium, the sector grid, the gate marked) and pinned as a paper sheet beside the distance list under a heading that states the purpose ("Where it is, and how far things are"). The file was renamed from `map.svg` to `map-lucknow.svg` so no cached old drawing could reappear.

**Result.** Two sheets side by side on desktop, stacked on a phone, each saying what it is.

**Lesson.** Every section needs a heading that states its purpose in the visitor's words. And when a cached asset is redrawn, change its name.

## 10. Honest pictures when there are no pictures

**Situation.** No photograph of the society exists in the project. The portal and brochure photographs are copyrighted. The site needs pictures.

**Problem.** Early versions used a Wikimedia photograph of Shaheed Path at dusk behind the booking form and in heroes. It looked like the society, and was not.

**What was done.** The Shaheed Path photograph was removed everywhere ("remove this photo overall"). Its places were taken by stills of the site's own 3D model, first rendered from the three.js scene through a snapshot function, then by Cycles renders of the Blender model. The six remaining Commons photographs (Hazratganj, the riverfront, the parks, the stadium, Rumi Darwaza) are captioned as what they are and credited in the footer; none is presented as the society. The author was asked for their own photographs.

**Result.** Every picture on the site is either the model or a credited photograph of the city.

**Lesson.** A found photograph that could be mistaken for the subject is worse than a drawing of the subject. Caption what a picture is, credit it, and never let it stand in for the thing it is not.

## 11. The phone hero bar that wrapped under the buttons

**Situation.** The stage's bar carried the dots, a URL, a tag and the three presets. On a phone the bar wrapped to two lines.

**Problem.** The stage's own buttons ("Take the tour" and the rest) were positioned a fixed distance from the top of the frame and now overlapped the second line of the bar.

**What was done.** On phones the dots and URL are hidden and the bar keeps one line with the tag on the left and the presets on the right. The route check at 375 confirmed no overflow.

**Result.** The bar is 44 pixels tall on a phone and the buttons start below it.

**Lesson.** A fixed offset from a container's top is a bet that the thing above it never grows. Either measure it or make sure it cannot wrap.

## 12. A price table on a phone

**Situation.** The price sheet has five-column tables (home, super area, carpet, sample price, floor).

**Problem.** At 375 the table had two failures: at first it overflowed the page; after the phone rules turned rows into stacked blocks with the header as a label before each value, a `white-space: nowrap` on numeric cells meant "₹37,25,345 to ₹37,30,545" still pushed the page to 383 pixels.

**What was done.** The phone rules display each row as a block, each cell as a flex line with its header from a `data-h` attribute, and let numeric cells wrap. The print stylesheet strips the paper and prints the tables black on white.

**Result.** All 19 routes fit 375 again.

**Lesson.** The route check that fails on any horizontal overflow and names the element is the single most useful automated check the project had. Keep one.

## 13. Navigation: tone instead of lines

**Situation.** The atelier export had a sticky top bar with a hairline under it and a blurred, translucent background.

**Problem.** The house rules ban hairlines and glass, and the lint failed on both. The bar also had to carry a brand mark, a name, a tag, seven links and a call to action.

**What was done.** The bar is sticky on the slightly darker surface cream, so it separates from the page by tone, with no line and no blur. The brand mark sits on a small board badge, the name over a yellow sector tag; the current page is a yellow block; the "Book a site visit" button appears from 60 em up; below that the links collapse to a menu on the board.

**Result.** Lint 0/0, and the bar reads as a strip of paper rather than a web component.

**Lesson.** Separation can come from a change of tone as well as from a line. When a lint rule and a reference design disagree, change the technique, not the intent.

## 14. The footer as the second dark surface

**Situation.** The footer had been a taped postcard: charming once, thin as a footer.

**Problem.** It held no address, no hours, no link list; the credits paragraph was the longest thing in it.

**What was done.** A dark three-column footer: the name with a "finished 2018 and 2024" tag and the RERA line; the sample lounge's address, phone, email, hours and a gold button; a two-column list of every page. Below, a darker band with the imprint and the picture credits, separated by colour, not a border.

**Result.** The footer carries the site's table of contents and its legal line, and the credits have a home.

**Lesson.** The footer is where a visitor goes when the page did not answer them. Give it the contact, the map of the site and the small print, and let it be the one other dark surface.

## 15. One live thing and honest labels: the EMI reader

**Situation.** Every real-estate site has prices. Few let the visitor do anything with them.

**Problem.** The sample prices risked being read as real, and a static table does not help someone deciding whether they can afford a flat.

**What was done.** The pricing page's "Read the monthly figure" card lets the visitor pick a home from a list that names the block, type, area and sample price, then set the down payment, the tenure and the interest rate with sliders; the monthly figure, the loan, the interest over the term and the total update as they move. Under it a note says plainly that it is a reading, not an offer, and names the banks that have approved the project on the listings. Every price on the site carries the word "sample", and the note band on the home page says "Nothing here is a promise."

**Result.** The one interactive element that uses the site's own numbers, with the caveat beside it rather than in a footnote.

**Lesson.** Give the visitor one thing to do with the data, built from the real content, and put the honesty next to the number, in the same type size.
