# Backlog Editor
**Updated: 25 June 2026**

---

## 🔴 BUCKET 1: Rename "Rental Item" to "Fleet Item"

- 🔴 Update labels: Makes users align to new terminology. Makes data model discussions easier. [10.0.49]
- 🔴 Update tables, objects, etc.: Important for long-term alignment. [10.0.50]

---

## 🔴 BUCKET 2: Brownfield / Adoption Blockers

- 🔴 Batch tracking: Make batch tracking optional. [10.0.50]
- 🔴 Fleet types as configurable table (not enum): Improves transparency and enables Deere non-fixed assets rental fleets. [10.0.50]
- 🔴 Existing inventory: Create fleet item from existing inventory. [10.0.50]
- 🔴 S/N: Make S/N optional. [10.0.50]
- 🔴 Consolidate fleet location and inventory location/warehouse: incl. on-hand availability across fleets and inventory/rental [10.0.50]
- 🔴 S/N: Serial entry at receipt vs. PO time. Most companies don't know VIN/serial at PO creation - only at receipt. [10.0.50]
- 🟡 Existing Fixed Asset: Associate an existing Fixed Asset with a fleet item.
- 🟡 Existing Fixed Asset: Create new fleet item from existing Fixed Asset.
- 🟡 Standard FA-from-PO-line conflicts with transfer process: If customer uses standard D365 FA creation on PO line, the rental transfer process tries to create a duplicate FA.
- 🟡 FA creation timing must be configurable: Some companies want FA at receipt; others at invoice. Current transfer-to-FA process is fixed.

---

## 🔴 BUCKET 3: Bulk Items

- 🔴 Bulk items behave as fleet items with quantity different from 1: On quotes, contracts, POs, fleet transfers, FA, item movements, etc). [10.0.50]
- 🔴 Incorporate bulk items into availability view: One line per bulk item type with quantity, [10.0.50]
- 🔴 FA process for bulk: One FA per unit vs. one FA for all; no transfer-to-FA path for bulk → items stuck in inventory limbo [10.0.50]
- 🟡 Scan and process: picking/quantity control on outbound movement
- 🟡 Allow bulk partial returns: cannot return 3 of 5 units on a single line
- ⬜ qty=2 on quote allowed for pricing, but on activation throws "only one rental item per contract line"
- ⬜ PO for bulk: qty > 1 on PO line not allowed when item is a rental item — system overwrites to 1
- ⬜ "FROM" error on contract activation with bulk items (system doesn't know location)
- ⬜ No qty tracking in movements — bulk items move as a group, not unit-by-unit
- ⬜ No bulk availability view — no way to see how many units are available for a class
- ⬜ No split-load support for bulk items across different drop-point addresses

---

## 🔴 BUCKET 4: AI skills & Rental UX outside of F&O

- 🔴 Entities and actions: Enables CAT & Deere to build their own UX on top of F&O capabilities. [10.0.50]
- 🔴 Expose entities and actions as agent skills: Agent needs to be able to query availability and prices, create quotes, contracts, CRUD jobsites, etc.

---

## 🔴 BUCKET 5: Demo data

- 🔴 Demo data: Rental demo data [10.0.50]

---

## 🔴 BUCKET 6: Financial tags

- 🔴 Financial tags defaulting: [10.0.50]

---

## 🔴 BUCKET 7: Check-in and check-out mobile app: Yard worker inspections and movement processing. [10.0.50]

- 🟡 Check-in and check-out ap: Yard worker inspections and movements processing. [10.0.50]

---

## 🔴 BUCKET 8: RPO

- 🔴 RPO: Validate rent-to-purchase scenarios. [10.0.50]

---

## 🟡 BUCKET 9: CAT: Improvements

- 🔴 CAT: Ability to associate customer with rental template. [10.0.50]
- 🟡 CAT: Auto-close expired quotes.

---

## 🟡 BUCKET 10: Configurability

- 🟡 Status codes as self-definable lists (not fixed enums): Both Physical status and Service status. Loxam wants their own status terminology.
- 🟡 Access to fleets: Limit fleet visibility per user/role

---

## 🟡 BUCKET 11: Improved search (free text, configurations and features, AI search)

- 🟡 Free text search: search on configuration, features, etc.
- 🟡 AI enabled search: Leverage AI reasoning and "outside/common sense" knowledge in search.
- 🟡 Scheduling view: Calendar view of availability and reservations.

---

## 🟡 BUCKET 12: Re-Rents

- 🔴 Preview build broken (WIP per Benjamin) [10.0.50]
- 🟡 Intercompany re-rent process: (renting from a sister entity)
- 🟡 Internal re-rent: financial dimensions not available on RentalLocation (only on InventSite — which was removed)
- 🟡 External re-rent: process unclear; PO-to-contract workaround only
- 🟡 Damage responsibility on return from external re-rent: no defined process

---

## 🟡 BUCKET 13: Automation Gaps

- 🟡 Enable item movements for purchases and sales: Inspections, etc.
- 🟡 (Auto-) create work order from item movement: For prep, etc. work flows
- 🟡 Customer - rental template links: Tie rental templates to one or more specific customers
- 🟡 Automatically change service status through item movement processes: For preparation, etc.
- 🟡 Movement → service location → auto-create WO: Moving a rental item to a service location should optionally auto-create a Field Service work order.
- 🟡 Damage decision code workflow: When a damage decision code is set on a movement, it should trigger automated follow-on actions (e.g., move to service location, create WO, set service status).
- 🟡 Location automation: Enable automatic change of location upon processing of item movement.
- 🟡 Auto-assign item: When adding a class to a contract an available unit should be automatically defaulted onto the contract for each line
- 🟡 Bulk update service status: For example, there's a service note on all CTL344s - now I want to update all those models to service status = 'Hard down'.
- 🟡 Clean up expired quotes: Auto-close expired quotes
- 🔵 Missing accessories auto-charge: When movement return lacks tracked accessories, system should auto-flag for charges.
- ⬜ Batch = New auto-set: When creating a rental item via PO flow, batch status should default to "New" automatically. Users missing this causes downstream failures.
- ⬜ Service status on item creation: When a new rental item arrives, service status should auto-default to "Preparation needed" (or configurable) — not rely on manual set. **Potentially handled by enablement of item movements for POs and SOs**
- ⬜ Work order for new equipment prep: Auto-trigger a WO when a new rental item's service status indicates preparation needed. Currently no way to create a WO without a customer.
- ⬜ Work order from movement record: Should be able to create/link a work order directly from a movement record (currently only from contract line).
- ⬜ WO completion → rental availability update: When FS work order is completed, rental item availability should automatically update (remove service block).

---

## 🟡 BUCKET 14: Intercompany

- 🟡 Intercompany rental processes: Needed for multi-entity deployments.
- 🟡 Global equipment card concept: Sycor model — a global equipment master (manufacturer info, descriptions) with LE-specific rental details underneath. Needed for multi-LE deployments and intercompany.
- 🟡 Global descriptions, manufacturer info, model specs: Need to exist once and flow to all LEs. LE-specific rental details possible
- ⬜ Asset maintenance (inspection intervals, service schedules, warranty templates) should be at the global/model level

---

## 🟡 BUCKET 15: Field Service Integration Gaps

- 🔴 FS-ProjOps billing path: Is the intended path for billing damage/service work to a customer via FS + Proj Ops? If so, clarify the design decision. [10.0.50]
- 🔴 Internal service work without customer: Work orders currently require a customer. Internal prep/maintenance work is non-customer — needs to be supported. [10.0.50]
- 🟡 FS PO sync (Dual Write) status unclear: Does PO created in FS for work order parts still sync to F&O? FS WO → parts PO → delivery date → WO completion → rental availability chain needs to work end-to-end.
- 🟡 ETA from work order on availability: WO expected completion date should surface in the rental item availability calendar.
- 🟡 Insurance & Warranty not linked to rental item: FS warranty only links to FA, not rental item. Cost allocation (covered vs. uncovered labor/parts) not tracked against per-item P&L.
- 🟡 Estimated return to rental fleet: Calculated return-to-ready times (average per model, time on last contract)
- 🔵 Inspection checklists ↔ FS inspection integration: Rental model-based inspection checklists should optionally trigger FS inspection templates. Regulatory inspection audit trails required for large customers.

---

## 🟡 BUCKET 16: Jobsite management

- 🔴 CAT: Add lat/long to jobsite. [10.0.50]
- 🟡 Jobsite deduplication: prevent duplicate addresses and near-identical lat/long.
- 🟡 Jobsite hierarchy: Jobsite can have multiple sub-locations
- 🟡 Jobsite grouping: Associate jobsite with rental location/territory

---

## 🟡 BUCKET 17: Pricing Gaps

- 🟡 Stepped pricing: Ability to configure stepped pricing.
- 🟡 No item-level pricing and discounting(only class-level): Workaround is unique class per item — causes class fragmentation at scale
- 🟡 Jobsite based pricing: Ability to use jobsite as a factor in pricing.
- 🔵 Multiple suggested rates: Always show BRC/book rate on quote with multiple rate suggestions (customer last, average

---

## 🟡 BUCKET 18: Counter rentals

- 🟡 Counter rentals: Integration with Commerce (10.0.52) [10.0.52]

---

## 🟡 BUCKET 19: Combined Sales and Rental

- 🟡 Combined quoting: Combined sales, RPO, and rental quote (Deere)
- 🟡 Fleet visibility: Get overview of combined sales + rental fleet
- 🟡 Automated fleet transfer: Quickly sell a rental item

---

## 🟡 BUCKET 20: Kitting / Packages

- 🟡 Package/kit concept in preview is incomplete — no mini-configurator (prime unit + bulk + accessories)
- 🟡 Pricing at package class level only; no association of specific items to a package
- 🟡 Movement must track individual kit components (for scanning at dispatch and return)
- 🟡 Damage tracking must work at component level within a kit
- 🟡 Package is currently tied to a Class, not specific items — unclear kit membership at runtime

---

## 🔵 BUCKET 21: Availability and Reservations

- 🔵 Improved availability summary: incl. soft reservations, called-off, and units under prep
- 🔵 Improved reservation management: promote class reservations to single-unit reservations

---

## 🔵 BUCKET 22: UX / Usability Polish

- 🟡 Movement status setup UX: Not intuitive — both Lachlan and Robert flagged. Needs tooltips aligned with documentation.
- 🟡 Multi-assign: fleet items to quote and contract lines
- 🔵 Availability view at your fingertips: Easily get availability overview directly from quote and contract screens
- 🔵 Inspection checkbox hidden: Completing inspection on a movement is buried in line details — not discoverable. Robert had to search to find it. Needs to be front-and-center.
- 🔵 Fleet transfer not launchable from Rental Item form: Robert wants to start fleet transfer directly from the rental item — not from a separate menu form.

---

## 🔵 BUCKET 23: Accessory Packs

- 🟡 Keys, safety cards, manuals, fuel guides, wheel chocks must go with equipment on every movement
- 🟡 No mechanism to track which accessories were dispatched on outbound or returned on inbound
- 🟡 Missing accessories on return should auto-flag and trigger charges
- 🟡 Distinct from bulk attachments: accessories are per-model standards, not separately purchased items

---

## 🔵 BUCKET 24: Transportation Management

- 🟡 Blanket PO for carrier vs. per-load PO — blanket approach not supported
- 🟡 No mobile app for driver or external carrier (scan/count at point of delivery)
- 🔵 No paperwork generated from system: no waybill, no hazmat documentation, no delivery receipt
- 🔵 No weight/dimensions on rental item record (should come from released product)
- 🔵 No routing/dispatch solution (ISV partner recommendation needed — acknowledge gap proactively)

---

## 🔴 BUCKET 25: Core Bugs / PP2 Quality Issues

- 🟡 [Bug 1143337 · P1] Inventory not updated + asset shows "not acquired" on New→Rental fleet transfer
- 🟡 [Bug 1141073 · P1] Error when transferring Rental → Used Fleet
- 🟡 [Bug 1141005 · P1] Hardcoded number sequence assumption on fleet transfer
- 🟡 [Bug 1142657 · P1] Physical status = "Ordered" (not "In stock") after PO receipt
- 🟡 [Bug 1143366 · P1] "Rental item availability" ≠ "Rental Item Availability summary" (inconsistency)
- 🟡 [Bug 1143411 · P1] Serial number doesn't appear on Rental Item forms even though it exists in inventory
- 🟡 [Bug 1143235 · P2] Fixed assets default view doesn't show rental items
- 🟡 [Bug 1143309 · P2] Default filter bug when assigning rental item to contract line
- 🟡 [Bug 1143343 · P2] Period codes error message misleading when >5 periods w/ Simulate Utilization
- 🟡 [Bug 1143346 · P3] UX: Rental Item tab confusing when creating a released product
- 🟡 [N/A · P1] Re-rents broken in current preview build (Benjamin confirmed WIP)
- 🟡 Date/time override model: Operations teams frequently enter data after-the-fact. System defaults to current time — SMU reading timestamp, movement record time, and return date all use system clock at entry. Needs configurable override.

---


<!-- tag-meta: {"_title":"Backlog","10.0.49":{},"10.0.50":{},"10.0.52":{}} -->