# Foods are implicit; stock units snapshot their label

There is no master data to create before labelling. Typing a new name when labelling creates a **Food**, and later labels autocomplete from it. Each **stock unit** copies everything printed on its label (title, preparation, portion, macros, dates, date meaning) and references its Food only for grouping and restock. We chose this over a classic product catalogue (Grocy-style) because master-data upkeep is the main click cost we want to beat, and because a printed label is physical: the record must keep matching the bag even after its Food is edited.

## Consequences

- Editing a Food never changes existing units or their labels; units are edited one by one (reprint offered only shortly after labelling).
- Typos create duplicate Foods, so fuzzy autocomplete and **merge** are required; a Food with units can be merged, never deleted.
- There is no partial quantity: a unit is in stock (optionally **opened**) or gone. Structured quantities are left to pantry (v2).
