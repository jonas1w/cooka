# cooka

A self-hosted kitchen app for a household (or small kitchen) that tracks frozen food from label to plate, plus a shopping list and recipes.

## Language

**Freezer label**:
The printed label stuck on a container before freezing; identifies one unit of frozen food and links back to it.
_Avoid_: HACCP label, sticker

**Discard**:
Removing a unit from stock without eating it (spoiled, expired, quality). Distinct from consuming it.
_Avoid_: Delete, throw away

**Discard reason**:
Why a unit was discarded. Per instance it is required, optional, or disabled (not asked at all).

**Stock history**:
The append-only record of every unit's lifecycle events (labelled, consumed, discarded, undone). Never edited, never purged; exportable.
_Avoid_: Audit log, HACCP log

**Instance language**:
The single language an instance uses for its UI and labels. Chosen per instance, not per person.
