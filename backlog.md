# Backlog Editor
**Updated: 12 August 2026**

---

## 🔴 BUCKET 1: Rename "Rental Item" to "Fleet Item" <!-- ado:1149935 -->

- ⬜ Rename "Rental Item" to "Fleet item" in UI [10.0.49] <!-- ado:1149936 -->
- 🔴 Rename "Rental item" to "Fleet item in tables, objects, etc. [10.0.50] <!-- ado:1149937 -->

---

## 🔴 BUCKET 2: Brownfield / Adoption Blockers <!-- ado:1149926 -->

- 🔴 Batch tracking: Make batch tracking optional. [10.0.50] <!-- ado:1149927 -->
- 🔴 Configurable fleet types (not hardcoded): Improves transparency and enables non-fixed assets rental fleets. [10.0.50] <!-- ado:1149928 -->
- 🔴 Existing inventory: Create fleet item from existing inventory. [10.0.50] <!-- ado:1149929 -->
- 🔴 S/N: Make serial number optional. [10.0.50] <!-- ado:1149931 -->
- 🔴 S/N: Serial entry at receipt vs. PO time. Most companies don't know VIN/serial at PO creation - only at receipt. [10.0.50] <!-- ado:1149932 -->
- 🟡 Consolidate fleet location and inventory location/warehouse: incl. on-hand availability across fleets and inventory/rental [10.0.50]
- 🟡 Existing Fixed Asset: Associate an existing Fixed Asset with a fleet item.
- 🟡 Existing Fixed Asset: Create new fleet item from existing Fixed Asset.
- 🟡 Standard FA-from-PO-line conflicts with transfer process: If customer uses standard D365 FA creation on PO line, the rental transfer process tries to create a duplicate FA.
- 🟡 FA creation timing must be configurable: Some companies want FA at receipt; others at invoice. Current transfer-to-FA process is fixed.

---

## 🔴 BUCKET 3: Bulk Items refactoring <!-- ado:1149939 -->

- 🔴 Bulk items behave as fleet items with quantity different from 1: On quotes, contracts, POs, fleet transfers, FA, item movements, etc). [10.0.50] <!-- ado:1149940 -->
- 🔴 Incorporate bulk items into availability view: One line per bulk item type with quantity, [10.0.50] <!-- ado:1149941 -->
- 🔴 FA process for bulk: One FA per unit vs. one FA for all; no transfer-to-FA path for bulk → items stuck in inventory limbo [10.0.50] <!-- ado:1149942 -->
- 🟡 Scan and process: picking/quantity control on outbound movement
- 🟡 Allow bulk partial returns: cannot return 3 of 5 units on a single line
- ⬜ qty=2 on quote allowed for pricing, but on activation throws "only one rental item per contract line"
- ⬜ PO for bulk: qty > 1 on PO line not allowed when item is a rental item — system overwrites to 1
- ⬜ "FROM" error on contract activation with bulk items (system doesn't know location)
- ⬜ No qty tracking in movements — bulk items move as a group, not unit-by-unit
- ⬜ No bulk availability view — no way to see how many units are available for a class
- ⬜ No split-load support for bulk items across different drop-point addresses

---

## 🔴 BUCKET 4: AI skills & Rental UX outside of F&O <!-- ado:1149943 -->

- 🔴 Entities and actions: Enables customers and partners to build their own UX on top of F&O capabilities. [10.0.50] <!-- ado:1133532 -->
- 🔴 Expose entities and actions as agent skills: Agent needs to be able to query availability and prices, create quotes, contracts, CRUD jobsites, etc. <!-- ado:1149944 -->

---

## 🔴 BUCKET 5: Demo data - Public Preview <!-- ado:1101548 -->

- 🔴 Demo data: Official rental demo data [10.0.50] <!-- ado:1149946 -->

---

## 🔴 BUCKET 6: Financial tags

- 🔴 Financial tags defaulting: [10.0.50]

---

## 🔴 BUCKET 7: Check-in and check-out mobile app: Yard worker inspections and movement processing. [10.0.50] <!-- ado:1147069 -->

- 🔴 Work item cards with actionable detail: Serial number, exact location, contract mapping (customer, contact, start and end date/time for contract etc), inspection status on the card, so the coordinator can act without calling the back office.
- 🔴 View-based navigation instead of complex filters: Separate work item views and menus rather than stacked filter controls - users found filtering overwhelming. Most critical is inbound and outbound.
- 🔴 Create damage record from the mobile app: Raise a damage record during inspection carrying asset, contract and photo evidence into F&O, so damage becomes chargeable and disputable.
- 🔴 Change service status from the mobile app: Let the inspector set the fleet item's service status in the field instead of waiting for a back-office update.
- 🔴 Work order request: Raise a work order request from the mobile app. Also, from within the report damages section, so that the work order request can be linked to the damage record.
- 🟡 Inventory, location and contract visibility in the field and ability to move hub location: Look up what is where, on which contract, from the device. Removes the help-desk dependency for basic information. Ability to move units between hub locations (e.g., to wash bay, to staging area, to service shop, etc.).
- 🟡 Barcode scanning: Enable lookup of movement records, fleet items, and contracts from scanning of fleet item barcodes.
- 🟡 Handle purchase and sales movements in the mobile app: Yard workers process all movement types on the same device. (Enablement of the movements themselves is tracked under Automation Gaps.)
- 🟡 Offline-first inspections: Save progress, capture photos and record comments without connectivity, syncing on reconnect. Jobsites routinely have no signal.
- 🟡 Pre-download inspection forms: Pull checklists before entering a low-connectivity area so an inspection is never blocked by a missing form.
- 🟡 Time-bound editing of completed inspections: Inspections remain editable for a limited window (24h suggested) for minor corrections; larger corrections follow an escalation path.
- 🟡 Role-based reopening of completed inspections: Only service advisors, managers and senior rental coordinators may reopen a completed inspection.

---

## 🔴 BUCKET 8: RPO <!-- ado:1125475 -->

- 🔴 RPO: Fix calculations and validate rent-to-purchase scenarios. [10.0.50] <!-- ado:1149947 -->

---

## 🟡 BUCKET 9: Private preview feedback: Improvements <!-- ado:1149948 -->

- 🔴 Private preview feedback: Ability to tie rental templates to one or more customers [10.0.50] <!-- ado:1108023 -->
- 🔴 Private preview feedback: Add latitude and longitude to jobsite (support for both decimals and degrees, incl. copy-pasting and pin) <!-- ado:1095542 -->
- 🟡 Private preview feedback: Auto-close expired quotes.

---

## 🟡 BUCKET 10: Configurability

- 🟡 Status codes as self-definable lists (not fixed enums): Both Physical status and Service status. Some customers want their own status terminology. Defaults should align with Field Service wording - Aug 2026 research found users confused by "Hold" vs "Open Repair".
- 🟡 Access to fleets: Limit fleet visibility per user/role
- 🟡 Configurable master data: Fleet item attributes

---

## 🟡 BUCKET 11: Improved search (free text, configurations and features, AI search)

- 🟡 Free text search: search on configuration, features, etc.
- 🟡 AI enabled search: Leverage AI reasoning and "outside/common sense" knowledge in search.
- 🟡 Scheduling view: Calendar view of availability and reservations.

---

## 🟡 BUCKET 12: Re-Rents

- 🔴 Re-rent of fleet items rented from competitors. [10.0.49]
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

- 🔴 FS -> Project Ops -> F&O: Costs, spare part consumption, and expenses must be linked to fleet item, so that you can see the expenses associated with a fleet item or across a class in F&O. [10.0.50] <!-- ado:1149953 -->
- 🔴 Internal service work without customer: Work orders currently require a customer. Internal prep/maintenance work is non-customer - needs to be supported. [10.0.50]
- 🔴 Damage recovery: Link WOs to damage records and invoices to facilitate recoupment of costs from damages. [10.0.50]
- 🟡 List of historical and open WOs on a fleet item: Rental coordinator should have a complete overview of all the WOs that have been opened on a particular fleet item.
- 🟡 FS PO sync (Dual Write) status unclear: Does PO created in FS for work order parts still sync to F&O? FS WO → parts PO → delivery date → WO completion → rental availability chain needs to work end-to-end.
- 🟡 ETA from work order on availability: WO expected completion date should surface in the rental item availability calendar.
- 🟡 Upcoming WOs: Timing of WOs from upcoming planned maintenance should be visible in F&O (affects availability for rent)
- 🟡 Insurance & Warranty not linked to rental item: FS warranty only links to FA, not rental item. Cost allocation (covered vs. uncovered labor/parts) not tracked against per-item P&L.
- 🟡 Estimated return to rental fleet: Calculated return-to-ready times (average per model, time on last contract)
- 🔵 Inspection checklists ↔ FS inspection integration: Rental model-based inspection checklists should optionally trigger FS inspection templates. Regulatory inspection audit trails required for large customers - including an immutable who/when/what-changed record on completed inspections.

---

## 🟡 BUCKET 16: Jobsite management

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

- 🟡 Combined quoting: Combined sales, RPO, and rental quote
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
- 🟡 Inspection checkbox hidden: Completing inspection on a movement is buried in line details — not discoverable. Robert had to search to find it. Needs to be front-and-center. Confirmed by Aug 2026 customer research.
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


<!-- tag-meta: {"_title":"Backlog","10.0.49":{},"10.0.50":{},"10.0.52":{}} -->

<!-- ado-meta: {"acked":{"1095542":"In Progress","1101548":"Proposed","1108023":"Not Started","1125475":"Proposed","1133532":"Proposed","1147069":"In Progress","1149926":"Proposed","1149927":"Not Started","1149928":"Not Started","1149929":"Not Started","1149931":"Not Started","1149932":"Not Started","1149935":"Proposed","1149936":"Closed","1149937":"Not Started","1149939":"Proposed","1149940":"Not Started","1149941":"Not Started","1149942":"Not Started","1149943":"Proposed","1149944":"Not Started","1149946":"Not Started","1149947":"Not Started","1149948":"Proposed","1149953":"Not Started"},"ignoredNew":[1143346,1056127,1133536,1133532,1057303,1149934,1139448,1149930,1057247]} -->