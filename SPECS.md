# Construction Estimate & Quote Management Application

## Product & Technical Specification

**Document purpose:** Define a maintainable, extensible application that automates the creation of professional construction estimates/quotes while preserving the flexibility of a document editor.

# 1\. Product Vision

The application should combine the structured data model of an estimating system with the usability and visual freedom of a word processor. The user should not need to manually format every page: they configure the company/user identity, document template, chapters and standard texts once, then create new estimates mainly by entering and selecting line items.

The system must be designed as a multi-screen application rather than a single estimate editor. The architecture should allow future modules such as customer management, item/product libraries, document templates, reporting, PDF generation, settings, backups and potentially invoicing or project management.

# 2\. Core User Workflow

A typical workflow is: open the application → view the dashboard → create a new estimate or open an existing one → select the customer → enter the subject/site information → add chapters → add line items → adjust descriptions, units and amounts → preview the generated document → export/print the final PDF → save the estimate.

The application should preserve reusable information. Customers, company details, standard notes, chapters and catalog items should be stored independently from individual estimates. When creating a new estimate, the user should be able to reuse these records and modify them locally without unexpectedly changing historical documents.

# 3\. Main Application Structure

Recommended top-level navigation:

- Dashboard — recent estimates, drafts, quick actions and basic statistics.
- Estimates — searchable list of all estimates with status, number, customer, date and total.
- Customers — customer/contact database.
- Item Library — reusable construction/work items with default descriptions, units and prices.
- Templates — configurable document layouts, cover pages, headers, footers and standard texts.
- Company / User Profile — address, postal code, telephone, email, slogan and other identity information.
- Settings — numbering rules, tax configuration, formatting defaults, backup/export options and application preferences.

# 4\. Estimate Data Model

An estimate should be represented as structured data, not as a collection of manually positioned text boxes. The rendering engine should transform this data into the final document.

| Entity       | Key fields                                                                         | Purpose                                   |
| ------------ | ---------------------------------------------------------------------------------- | ----------------------------------------- |
| Estimate     | id, estimateNumber, year, customerId, subject, site, creationDate, status, taxRate | Top-level commercial document.            |
| Customer     | name, address, phone, email, taxId, notes                                          | Reusable customer information.            |
| Chapter      | id, estimateId, title, order                                                       | Groups related work items.                |
| LineItem     | id, chapterId, code, description, unit, quantity, unitPrice, amount, order         | Individual priced work item.              |
| Template     | cover, header, footer, typography, spacing, table rules                            | Controls document appearance.             |
| UserProfile  | name, address, postalCode, phone, email, slogan                                    | Identity shown in generated documents.    |
| StandardText | key, title, content                                                                | Reusable notes and legal/commercial text. |

# 5\. Estimate Numbering

The visible estimate number should support a configurable pattern such as XXX-YY, where XXX is a sequential number and YY is the two-digit year. The numbering service should be independent from the UI so the format can later be changed without rewriting the estimate editor. The application should prevent accidental duplicate numbers and should preserve the original number of an issued/sent estimate.

# 6\. Document Layout and Rendering

The generated document consists of a cover page followed by one or more content pages and a final section containing the estimate total, standard note and customer acceptance/signature area. Pagination must be handled by a document/PDF rendering engine rather than by hard-coded page breaks wherever possible.

## 6.1 Cover Page

The cover should contain the estimate number (for example, 'Estimate No. 123-26'), customer information, address, telephone, email and subject. The template should support a configurable background image, creation location/date positioned at the upper-right area, and a configurable slogan positioned near the lower-right area.

## 6.2 Content Pages

Each chapter starts with a chapter title followed by a table of line items. Item numbering is hierarchical: 1.1, 1.2, 1.3 for Chapter 1; 2.1, 2.2 for Chapter 2, etc. The table should contain at least: item number, description, units and amount. The quantity and unit-price model should still be stored internally even if a particular template only displays the final amount.

The description column must be flexible. The user should be able to adjust column widths, typography and row behavior through the template system. Long descriptions must wrap naturally across lines, and rows must be allowed to grow vertically without overlapping adjacent content.

## 6.3 Repeating Header and Footer

Every content page should automatically display a header containing the estimate number and location/date, e.g. 'Barcelona, a 15/08/2026'. Every page should display a footer containing 'Page X of Y' and the current user's/company address, postal code, telephone and email.

Header and footer values should be generated from document data and user/template settings rather than manually typed into each page. The rendering engine must calculate the final page count so 'X of Y' remains correct after pagination.

## 6.4 Final Page

The final page should contain the total estimate amount, explicitly labelled as excluding VAT (IVA not included), followed by a configurable standard note and a customer acceptance/signature area labelled 'Conforme cliente'. The final-page components should be template-driven so their position, typography and wording can be changed later.

# 7\. Estimate Editor UX

The editor should feel closer to a structured Word document than to a traditional spreadsheet. The user should see chapters and line items in a clear document hierarchy, while the application automatically handles numbering, totals, pagination and repeated page elements.

Useful interactions include adding/removing/reordering chapters, adding line items from the library, duplicating an item, editing a description inline, changing units and amounts, dragging chapters/items to reorder them, and previewing the rendered document.

A key design principle is separation between content and presentation: users edit estimate data in the editor, while templates control how that data is rendered. This prevents every estimate from becoming a manually formatted document and makes future design changes practical.

# 8\. Reusable Item Library

The item library is one of the most important productivity features. A library entry should contain a default description, unit, default price and optional metadata such as category, keywords and internal code. The user should be able to search the library while editing an estimate and insert an item with one action.

When an item is inserted into an estimate, its relevant values should be copied into the estimate. Later changes to the library must not silently modify historical estimates.

# 9\. Templates and Customization

Customization should be implemented as a first-class feature. A template should define page size, margins, typography, colors, background assets, cover layout, header/footer layout, table columns, spacing, borders and final-page components.

The first version should avoid attempting to reproduce every feature of Microsoft Word. Instead, provide a constrained layout system designed specifically for estimates. This gives users substantial control while keeping rendering deterministic and maintainable.

# 10\. PDF and Printing

PDF generation should be deterministic and suitable for professional printing. The application should provide at least Preview, Export PDF and Print actions. The same document data and template should produce the same layout regardless of whether it is being previewed or exported.

# 11\. Architecture Recommendation

A modular architecture is strongly recommended. The application should separate the domain model, persistence, UI, document rendering and configuration layers.

- Presentation layer: dashboard, estimate editor, customer manager, library manager, template editor and settings.
- Application/services layer: estimate creation, numbering, totals, validation, search, duplication and document generation.
- Domain layer: Estimate, Chapter, LineItem, Customer, Template, UserProfile and related business rules.
- Persistence layer: database repositories and file/asset storage.
- Rendering layer: converts structured estimates and templates into paginated PDF/document output.
- Asset layer: background images, logos, fonts and other template resources.

For a desktop-first application, a local database such as SQLite is a practical starting point. It avoids requiring a server and is well suited to a single business/user environment. The persistence API should nevertheless be abstracted so a future cloud database or multi-user backend can be introduced without redesigning the domain model.

# 12\. Suggested Technology Direction

Because the application is document-heavy and must work well on a desktop, a desktop application is a sensible first target. A possible implementation is a modern web-based UI packaged as a desktop application, with a local SQLite database and a dedicated PDF/document rendering subsystem. The exact framework should be selected after a small technical prototype validates PDF pagination, editable tables and template rendering.

The implementation should avoid putting business logic directly inside UI components. This is particularly important if AI is used to generate the code: clearly separated modules make generated code easier to review, test and replace.

# 13\. Historical Data / Existing Estimates

The application should include an import strategy for the user's existing estimates. The exact mechanism depends on the format of the old application (PDF, Word, Excel, database, etc.). At minimum, the system should support importing reusable customers, standard texts and item descriptions from a structured source. If old documents are only available as PDFs, importing them may require a separate extraction process and should not be assumed to be perfectly automatic.

# 14\. Versioning and Historical Integrity

Once an estimate has been issued, the application should preserve a snapshot of the data and template used to generate it. Changing the customer record, item library, company profile or template later must not alter an already issued estimate.

A future version could add estimate revisions, e.g. '123-26 Rev. 2', with a comparison between versions.

# 15\. Validation and Business Rules

- Estimate number must be unique within the configured numbering scope.
- Every estimate must have a customer and creation date before it can be finalized.
- Every chapter must have a title and a stable ordering value.
- Every line item must belong to exactly one chapter.
- Amounts should be calculated from stored numeric values rather than parsed from formatted text.
- The total should be calculated from line-item amounts and rounded according to a configurable monetary precision.
- Issued estimates should be immutable or require an explicit revision workflow.
- Template assets should be validated before a template can be used for final PDF generation.

# 16\. Testing Strategy

Testing should focus particularly on document generation because visual pagination is a major source of defects. Unit tests should cover numbering, totals, rounding, ordering and validation. Integration tests should verify database persistence and estimate duplication. Rendering tests should generate representative PDFs containing short and very long descriptions, many chapters, page breaks and final-page content.

# 17\. Development Phases

| Phase                         | Scope                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Phase 1 — Foundation          | Project structure, database, domain models, application shell and basic navigation.             |
| Phase 2 — Estimates           | Create/edit/save estimates, customers, chapters and line items; automatic numbering and totals. |
| Phase 3 — Document generation | Cover, tables, headers, footers, pagination, final page and PDF export.                         |
| Phase 4 — Reuse               | Item library, reusable customers, standard texts and estimate duplication.                      |
| Phase 5 — Customization       | Template system, typography, column widths, images and layout configuration.                    |
| Phase 6 — Data migration      | Import existing information and provide backup/restore.                                         |
| Phase 7 — Quality & polish    | Automated tests, error handling, performance, accessibility and production packaging.           |

# 18\. Future Expansion

The design should leave room for features that are not required in the first release: multiple users and permissions, cloud synchronization, company branches, estimate status workflows, emailing PDFs, electronic signatures, invoicing, project tracking, supplier/product catalogs, VAT variants, multilingual templates, analytics, automatic backups and integrations with accounting software.

# 19\. Non-Goals for the First Release

The first release should not attempt to become a complete ERP, accounting system or unrestricted Microsoft Word replacement. Its primary purpose is fast, reliable and highly customizable construction estimate generation. Keeping this scope narrow will make the application significantly easier to build and maintain.

# 20\. Acceptance Criteria for the MVP

A first usable version is successful when a user can create a customer, create an estimate with an automatically assigned number, add multiple chapters and reusable line items, edit descriptions and amounts, save the estimate, preview a correctly paginated document, and export a professional PDF containing the configured cover, repeating header/footer, item tables, final total, standard note and customer signature area.

The user must also be able to change the company information and standard texts without editing source code, and must be able to reuse information from previous estimates.

# 21\. Implementation Principle

The most important architectural decision is to treat an estimate as structured business data plus a presentation template. Do not implement the application as a collection of hard-coded pages. The UI should edit the structured data, and a rendering engine should generate the final pages. This approach directly supports customization, reuse, historical integrity and future expansion.
