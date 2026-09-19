Program Update Log — Figma / UI Requirements

1. Global Navigation

Top-Level Tab Order

Update the primary navigation to follow this order from left to right:

Bid Board

Task Tracker

Team Connection

Business Development

Resources

Company Calendar

Vendor Contacts

GC Contacts

Navigation Changes

Resources must be its own top-level tab and no longer be embedded within Task Tracker.

Team Connection must be its own top-level tab and no longer be embedded within Task Tracker.

Vendor Contacts must be removed from Resources and become its own top-level tab.

Keep all other existing resource material under Resources.

Vendor Contacts and GC Contacts should sit beside each other at the end of the main operational/contact navigation area.

2. Company Calendar

Add a new top-level Company Calendar tab.

The calendar should be used for company-wide events including:

Company Events

Lunch & Learns

Holidays

Other internal scheduled events

Figma Requirements

Design:

Monthly calendar view

Event detail modal/drawer

Event type/category

Date

Time

Location

Description

Attendees, if applicable

3. Business Development

BD Team

Business Development personnel should include the previously provided team plus:

Todd Maze

BD selections in the CRM, Bid Board, and Business Development module should all pull from the same source list so the assignments remain synchronized.

Daily Report System

Add a new Daily Report section/tab inside the Business Development module.

Daily Requirement

Each BD representative must complete a Daily Report for every working day.

Next-Day Lockout Logic

If a BD representative has not completed the required report for the previous business day:

Their Business Development workspace should be locked.

They should not be able to perform their normal BD functions.

The Daily Report completion screen should become the required action.

Once the previous day's report is submitted, normal access is restored.

The purpose is to make Daily Reports a mandatory part of the BD workflow rather than an optional activity.

Report Filing

Reports should automatically file by:

Employee

Report date

Submission date/time

Report History

Create a searchable Daily Report archive.

Users should be able to search/filter reports by:

BD Representative

Date

Date Range

Keyword / Report Content

Figma Screens

Design:

Daily Report entry screen

Previous-day report lockout screen

Daily Report history/archive

Report search/results screen

Individual report detail view

4. Business Development — Hot Projects

Upgrade the Hot Projects section to include analytics and charts.

Visibility

Hot Projects should not be limited to projects belonging to the currently logged-in BD representative.

Authorized users should be able to see Hot Projects across all BD representatives.

Dashboard / Charts

Add visual charts based on Hot Project status.

Potential views should include:

Hot Projects by Status

Hot Projects by BD Representative

Hot Projects by Office

Hot Projects by Time Period

Total Active Hot Projects

Charts should update based on the current Hot Projects data.

Figma Layout

The Hot Projects page should contain:

Top Area

KPI/count cards

Analytics Area

Status charts

BD rep breakdown

Project Area

Hot Projects list/table/cards

5. Business Development — Project Detail

When a user opens a project from the Business Development module:

Bid Board Photo

Display the project's Bid Board photo prominently within the BD project detail screen.

The photo should come from the same project record and should not require a separate BD upload.

Data Synchronization

Bid Board and Business Development should reference the same:

Project photo

Project name

Address

Office

Assigned BD representative

Building Type

Type of Bid

Work Type

Project status

6. Vendor Contacts / Vendor Information

RFQ Requirements

Each vendor should have a dedicated section explaining what that vendor requires when requesting a quote.

Examples could include:

Door sizes

Door thickness

Swing/orientation

Glass makeup

Finish

Impact requirements

Hardware information

Elevations

Quantities

Relevant plans/details

Other vendor-specific requirements

Figma Requirement

Add a clearly visible field/card such as:

“RFQ Requirements”

or

“What This Vendor Needs for a Quote”

This information should be easy for an estimator to reference before sending an RFQ.

7. CRM — Company / GC Contacts

Companies Subpage

Rework the Companies/GC Contacts area so it operates more like a structured company follow-up system.

The workflow should show:

Company Overview

Contacts

Follow-Up Activity

Current Status

Next Action

Related Bids / Opportunities

Historical Activity

Company resource pages should follow the same overall UX pattern.

Company Contact Analytics

Add filtering controls to Company/GC Contact analytics.

Allow filtering by:

Office

Year

Custom Date Range

Person / Employee

Analytics should dynamically update as filters change.

8. Bid Board

Top Dashboard Layout

Adjust the count/KPI cards at the top of the Bid Board so they fit cleanly across a standard desktop screen.

Avoid excessive wrapping or oversized cards.

Project Photo Upload

Improve the photo-upload UI.

During project upload:

Provide a square image area.

Allow photo upload/paste directly into the square.

Automatically crop/fit the photo appropriately.

Do not require users to fix the image after the project has already been added to the Bid Board.

The same photo should carry into the Business Development project view.

9. Bid Board — Upload / Parsing Workflow

AI Parsing

Simplify the upload process.

Workflow should be:

Upload → AI Parse → Autofill Fields → User Reviews/Edits

Do not require a secondary confirmation box after parsing.

Remove

Email Sent Date

Extra AI parsing confirmation step

Drawing Level

Remove the dropdown selection from Drawing Level during upload.

Drawing Level should no longer be handled as a forced dropdown field.

10. Bid Upload — Type of Bid

Rename the former Lead Source field to:

Type of Bid

Type of Bid options should include:

Hard Bid

Budget

Remove:

Sealed Bid

Negotiated

The parser should attempt to determine Type of Bid automatically when the bid documents or invitation provide enough information.

11. Bid Upload — Building Type

The old Type of Bid / Project Market field becomes:

Building Type

Examples:

Medical

School / Education

Office

Multifamily

Hospitality

Government

Retail

Industrial

Other

CRM Alignment

Building Type replaces Contract Type in the CRM.

The same Building Type value should carry between:

Bid Board

CRM

Business Development

12. Bid Upload — Work Type

Rename:

Products & Services → Work Type

Work Type options should specifically be:

Glazing

Cladding

Glazing & Cladding

Use this same terminology throughout the system.

13. Bid Upload — Type of Construction

Add:

Type of Construction

Options:

New Construction

Renovation

Upfit

Other

AI parsing should autofill this field when sufficient project information exists.

14. Client Tier

Add a Client Tier field.

Options:

Tier 1

Tier 2

Tier 3

Tier 4

Tier 4 should represent clients that have not otherwise been assigned a formal tier.

Where client tier information already exists, the system should autofill the value.

15. Business Development Assignment

Add Business Development assignment to the project/upload workflow.

Use the standardized BD team list across the entire application.

Include:

Existing BD team members

Todd Maze

Open / Unassigned

Assignments must synchronize between:

Bid Board

CRM

Business Development

16. Manager Assignment

Manager selections should be limited to:

Ray

Paul

Blake

Luis

When an employee is assigned to a project, the program should use the existing organizational/reporting tree to automatically assign that employee's manager where appropriate.

17. Office Assignment

The Office field should automatically populate during Bid Board upload based on project location.

Offices:

Charlotte

Atlanta

Charleston

Radius Rule

If a project is located within 70 miles of an office, assign it to that office.

Outside the 70-Mile Radius

Projects in North Carolina → Charlotte

Projects in Virginia → Charlotte

Projects in the Nashville area and south of Nashville → Atlanta

The project address should be pulled from the bid information whenever possible and used to calculate office assignment.

The Office value should then carry into CRM and Business Development.

18. Multiple GC Plan Links

Inside the GC section of the Bid Upload, allow users to enter multiple GC Plan Link URLs.

UI Behavior

Do not limit the project to one plan link.

Use an interface such as:

GC Plan Links

[ URL __________________ ]
[ + Add Another Link ]

Each added URL should be retained on the project.

Data Carryover

All GC Plan Links should remain connected to the project and carry across relevant areas including:

Bid Board

Project Detail

CRM

Business Development

19. Internal Notes

The Internal Notes section on Bid Board projects should be directly editable.

When a user clicks/opens a project from the Bid Board:

Display Internal Notes.

Allow the user to click directly into the field.

Allow editing and saving without having to navigate to another screen.

Figma Interaction

Use either:

Inline editable text area

or

Click-to-edit notes card

The interaction should feel immediate and lightweight.

20. Fields / Features to Remove

Remove the following:

Client Profile

Marketing Status

Contract Type

Replaced by Building Type

Sealed Bid

Negotiated Bid

Active Bid box/status

Email Sent Date

Estimated Cost

Drawing Level dropdown

21. Figma Design Principles

This update should be designed around a single connected workflow, not individual disconnected pages.

Shared Data

Where the same information appears in multiple areas, it should visually represent the same underlying data rather than requiring duplicate entry.

Examples:

Project
→ Bid Board
→ Business Development
→ CRM
→ Hot Projects

Company
→ GC Contacts
→ Bid History
→ Follow-Ups
→ Business Development

Vendor
→ Vendor Contacts
→ RFQ Requirements
→ Resource Information

Figma Components

Use reusable components for:

Project cards

Status chips

Employee selectors

Manager selectors

BD selectors

Office selectors

Building Type selectors

Work Type selectors

Type of Bid selectors

KPI cards

Analytics charts

Search bars

Date-range filters

Notes fields

URL/link fields

Contact cards

Daily Report cards

Modals / drawers

UX Goal

Reduce duplicate entry and make project information flow naturally between Bid Board → CRM → Business Development → Contacts/Resources.

Status: IN PROGRESS — Continue adding notes to this master Figma update log.