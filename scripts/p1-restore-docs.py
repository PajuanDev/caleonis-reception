"""Restore inherited English reference coverage and complete the bilingual help corpus.

Only reads the pinned upstream Git tree; does not contact a provider or production.
The reviewed generated MDX files are the published sources, not an external translator.
"""
from pathlib import Path
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'mintlify'
SOURCE = 'e8e23bae4955f64fa3f99cb525faad908439077e'
PUBLIC_SOURCE = ROOT / '.tmp/lobbystack-public-upstream/mintlify'
assert PUBLIC_SOURCE.is_dir(), 'Prepare the read-only MIT upstream checkout at .tmp/lobbystack-public-upstream before restoring native translations.'


def git(path):
    native = PUBLIC_SOURCE / path.removeprefix('mintlify/')
    # The runtime API reference stays pinned to the Caléonis implementation.
    if native.is_file() and not path.startswith('mintlify/api/'):
        return native.read_text(encoding='utf-8')
    return subprocess.check_output(['git', 'show', f'{SOURCE}:{path}'], cwd=ROOT).decode('utf-8')


def put(slug, title, description, body):
    path = DOCS / f'{slug}.mdx'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('---\ntitle: ' + json.dumps(title, ensure_ascii=False) + '\ndescription: ' + json.dumps(description, ensure_ascii=False) + '\n---\n\n' + body.strip() + '\n', encoding='utf-8')


paths = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', SOURCE, 'mintlify'], cwd=ROOT).decode().splitlines()
paths += ['mintlify/getting-started/number-countries.mdx']
for path in paths:
    if not path.endswith('.mdx'):
        continue
    slug = path.removeprefix('mintlify/').removesuffix('.mdx')
    content = git(path)
    content = content.replace('https://app.lobbystack.com', 'https://receptionist.caleonis.com')
    content = content.replace('https://docs.lobbystack.com', 'https://receptionist.caleonis.com/aide')
    content = content.replace('https://lobbystack.com', 'https://receptionist.caleonis.com')
    content = content.replace('LobbyStack', 'Caléonis Receptionist')
    # Internal identifiers, variable names and package names are intentionally retained.
    content = re.sub(r'!\[[^\]]*\]\(/images/screenshots/[^)]+\)\n\n_[^\n]+_\n?', '', content)
    content = re.sub(r'(href="/|\]\(/)(?!images/|en/)([^"\s)#?]+)', lambda m: m[1].replace('/', '/en/', 1) + m[2], content)
    if slug == 'api/requests':
        content = content.replace('New bookings sync to the connected calendar and queue the usual confirmation and reminder texts. Caléonis Receptionist sends them only to contacts who agreed to texts. Pass `"sms_consent": true` when the customer agreed while booking.', 'New bookings queue calendar synchronization. A booking success does not prove an external calendar event or a delivered notification. The French Voice-only pilot cannot send SMS. Pass `"sms_consent": true` only when the customer actually agreed; consent never bypasses sender-capability checks.')
    if slug.startswith('self-hosting/'):
        content = content.replace('https://github.com/lobbystack/lobbystack.git', 'https://github.com/PajuanDev/caleonis-reception.git')
        content = content.replace('cd lobbystack', 'cd caleonis-reception')
    target = DOCS / 'en' / f'{slug}.mdx'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')

EN = {
'introduction': ('Understand Caléonis Receptionist', 'Your receptionist, operating dashboard and the exact scope of the French pilot.', '''
Caléonis Receptionist answers business telephone calls using one receptionist per business. It uses your greeting, business knowledge, services and rules. The dashboard keeps calls, messages, contacts, appointments, transcripts and available recordings together.

Start with the [setup guide](/en/quickstart) for a new workspace. For an existing workspace, use the daily dashboard guides and review the [availability table](/en/support/availability) before relying on an action.

<CardGroup cols={2}>
  <Card title="Setup guide" icon="rocket" href="/en/quickstart">Prepare your account, business details, sources, greeting and first controlled test.</Card>
  <Card title="Configure your receptionist" icon="robot" href="/en/agent/overview">Configure AI settings, knowledge, services and rules.</Card>
  <Card title="Review daily activity" icon="file-lines" href="/en/dashboard/home">Review calls, follow-ups, appointments, contacts and trends.</Card>
  <Card title="Connect your tools" icon="plug" href="/en/integrations/overview">Connect Google Calendar and integrate authorized tools through webhooks.</Card>
</CardGroup>

## What your receptionist can help with

- Answer inbound calls on the number assigned to the business, after operator approval.
- Use a saved greeting and a fallback language when the caller's language is unclear.
- Retrieve facts from text, processed documents and authorized public website imports.
- Create an appointment when services, opening hours, booking policy and Google Calendar allow it.
- Take a callback or follow-up request for the team. This does not place an outbound call.
- Keep the conversation, summary, available audio and result in a private business workspace.
- Expose authorized business data through the REST API and the optional MCP integration.

Inbound PSTN conversation, transcript, private recording playback and a Google Calendar test booking were qualified for the pilot on 15 October 2026. Human transfer, appointment changes and long-term Google authorization need their own qualification. The French pilot line is **Voice-only**: it neither sends nor receives SMS.

## Main dashboard areas

| Area | Pages | Purpose |
| --- | --- | --- |
| General | Home, Calls, Messages, Contacts, Appointments | Daily activity, conversations, customer records and bookings. |
| Agent | AI settings, Knowledge, Services, Rules | One receptionist's greeting, factual sources, service descriptions and handling policy. |
| Manage | Analytics, Integrations, Settings | Activity, Google Calendar, webhooks, members, preferences, number and usage. |

There is no additional Channels section, multi-agent catalogue or Agent Builder in this V1 flow. Prices and commercial commitments remain subject to approval; inherited plan names are not an approved Caléonis offer.
'''),
'quickstart': ('Set up Caléonis Receptionist', 'Follow the complete preparation and controlled-test sequence before opening a line to customers.', '''
This tutorial follows the existing onboarding and dashboard workflow. The operator must authorize access to the pilot; a working signup form does not itself grant a production service or a phone number.

## Before you begin

Prepare your own email address, a unique password, the exact business name, public contact details, opening hours and service area. Prepare a public website or documents you may legally use. For booking, use a Google account with write access to a dedicated test calendar.

Have a test telephone you control and a short, fictitious scenario. Do not enter health data or customer records for a first test. Account phone verification and the business reception number are separate.

## Onboarding steps

<Steps>
  <Step title="Create or open the authorized account">Use [signup](https://receptionist.caleonis.com/signup) when registrations are open, or use your invitation. Sign in at [login](https://receptionist.caleonis.com/login). If access is closed, contact the workspace operator rather than creating another account.</Step>
  <Step title="Name the business">Enter the name callers should hear. Check the active business before saving anything. The business name and a custom greeting are separate settings.</Step>
  <Step title="Import your website">Enter a public URL you control or are authorized to use, or choose Skip for now. Services, hours, FAQ and contact pages are useful. Private pages, internal addresses and login-only pages are excluded.</Step>
  <Step title="Add knowledge documents">Upload accepted documents or add factual text. Wait for processing and review the extracted content in Agent > Knowledge. An entry marked queued, indexing or error is not a ready source.</Step>
  <Step title="Set the greeting">Write a short opening line naming the business and explaining the help available. Prepare the required information about AI and recording with the responsible operator.</Step>
  <Step title="Verify account details">Complete any email or mobile verification the authorized flow requests. A verification code is not permission to send appointment or operator SMS.</Step>
  <Step title="Review service and number conditions">Confirm the approved offer and number assignment with the operator. The inherited Free, Starter and Pro flow does not establish Caléonis pricing or a right to a French number. Do not complete a paid checkout for a review.</Step>
  <Step title="Finish onboarding">Review AI settings, Knowledge, Services and Rules. Configure a realistic callback service and booking mode; leave unqualified actions unavailable.</Step>
</Steps>

## Prepare booking

1. Add the service name and its duration. A 15-minute quote callback is different from an onsite job.
2. Set opening hours, closures, booking policy and the **Europe/Paris** business time zone.
3. Connect [Google Calendar](/en/integrations/google-calendar) and select a writable test calendar.
4. Check a slot against both the dashboard and Google before the voice test.

## Make your first controlled call

Use the dashboard test call only if enabled for your business, or call the assigned business number from your own phone. Ask one factual question and make one authorized test booking. Refuse SMS if testing the no-notification path.

After the call, check [Calls](/en/dashboard/calls): greeting, summary, transcript, audio availability and action result. Open the event directly in Google and compare the date, local time, duration and selected calendar. A confirmed booking does not establish SMS, email or operator-alert delivery.

## Before real callers

Check the number's voice/SMS capabilities, privacy information, team access, opening hours, callback process, calendar renewal and operational support. Do not enable transfer or appointment changes on the strength of a booking test alone. Keep a manual fallback and a reversible call-forwarding plan.

<CardGroup cols={2}>
  <Card title="AI settings" icon="comment-dots" href="/en/agent/ai-settings/overview">Greeting, language and booking policy.</Card>
  <Card title="Knowledge" icon="book-open" href="/en/agent/knowledge">Texts, documents, website import and processing.</Card>
  <Card title="Services" icon="calendar-check" href="/en/agent/services">Descriptions, durations and booking prerequisites.</Card>
  <Card title="Usage" icon="credit-card" href="/en/billing/usage">Consumption, unknown costs and approved limits.</Card>
</CardGroup>
'''),
'getting-started/account-setup': ('Create and secure your account', 'Authorized signup, login, account changes and recovery.', '''
Your account identifies you as a person. Business memberships determine which workspaces you may access. Use your own account; invite other operators instead of sharing a password.

## Create an account

1. Open [signup](https://receptionist.caleonis.com/signup) when the operator has authorized registration, or follow the invitation sent to your own address.
2. Enter your email and a strong, unique password. Follow the length and complexity checks displayed by the form.
3. Submit the form and complete any verification presented.
4. Follow the [setup guide](/en/quickstart) to create or join the intended business.

The pilot may restrict registrations. Do not infer a free plan, included number or activated feature from account creation.

## Log in and recover access

Open [login](https://receptionist.caleonis.com/login), enter your account credentials and verify the selected business. If the form provides Forgot password, request a reset for your own address and use the link from the transactional email. Check spam, the address and the message's date before retrying.

A submitted reset request is not proof of email delivery. Do not send a password or a reset link to support. A general error should be diagnosed without disclosing whether another person's account exists.

## Change account details

Open **Settings > Account**. The controls visible to your role define what you can change.

### Business name

Edit the business name and save. Check the dashboard and make a new test call. A custom greeting may need a separate update under AI settings.

### Email address

Enter the new email in the available account control and follow the verification flow. Keep using the previous confirmed address until the application confirms the change. Check the new mailbox; do not assume a Save action alone has changed the login identity.

### Password

Use the password change form, enter the requested current password, then the new password and confirmation. Save and follow the displayed session instructions. Do not assume other sessions were revoked unless the interface confirms it.

## Account security

Sign out on shared devices. For suspected exposure, change the password and have an administrator review business members, API keys and connected applications. Account phone verification does not provide the reception number and does not enable SMS on a Voice-only line.

See [Account](/en/settings/account), [Team](/en/settings/team) and [Privacy](/en/support/privacy).
'''),
'getting-started/claim-your-number': ('Prepare your business phone number', 'Number assignment, French constraints, forwarding and continuity.', '''
A business reception number is a real PSTN telephone number linked to the correct business. It is distinct from the mobile phone used to verify an operator's account.

## Before assignment

Have the operator confirm the legal subscriber, required documentation, country, location restrictions, capabilities and recurring charges. In the French pilot, the approved number is assigned to the sole trader operating as MrManiac. An inherited number-picker or checkout does not authorize resale, subletting or assignment to another client.

The US/Canada search options, local area-code suggestions, toll-free inventory and automatic number inclusion described by the upstream product are not a French Caléonis entitlement. An available search result is not proof that the number can legally be attributed to your business.

## Authorized assignment workflow

1. Confirm the approved commercial conditions and number-holder identity.
2. Complete the operator's required regulatory review.
3. Review the selected number, country, locality, monthly fees and voice/SMS capabilities.
4. Have the authorized operator complete assignment and SIP routing.
5. Open **Settings > Phone number** and verify that the right business displays the right number.
6. Call from your own telephone, confirm the greeting and inspect the resulting call record.

Do not purchase, replace or release a number just to explore the interface. A successful inbound call must be checked after any authorized routing change.

## Voice-only

The French pilot number is **Voice-only**. It cannot send or receive SMS. Recording a mobile contact or an SMS preference cannot add that capability. Messages remains in the sidebar and may legitimately contain no SMS conversations.

## Keep your existing customer-facing number

Call forwarding is performed by your current telephone provider. Ask about unconditional, busy or no-answer forwarding and their cost. Keep a record of the previous setting and how to restore it.

Test forwarding from an external telephone, verify the receptionist's business greeting and the saved call, then test rollback. Avoid a forwarding loop between your old line and the reception number. See [Call forwarding](/en/support/phone-forwarding).

## Changing or releasing a number

A replacement can interrupt incoming calls and may require new documentation and fees. Identify who controls the number, how callers will be informed and what happens to existing forwarding before authorizing the change.

The upstream Free-plan 30-day release rule is not published as a Caléonis contractual rule. Retention and termination terms must be confirmed for your approved offer.

## Porting

Porting is separate from forwarding and needs its own eligibility and continuity review with the current carrier. No automatic porting or portability promise is made by this guide.
'''),
'agent/ai-settings/appointment-changes': ('Configure appointment changes', 'Identification, explicit confirmation, verification and separate end-to-end qualification.', '''
The code includes appointment lookup, cancellation and rescheduling controls. Enable these only after the entire workflow has been qualified for your business. A successful new Google booking does not qualify cancellation or rescheduling.

## Requests the workflow covers

The receptionist may identify an upcoming appointment, ask the caller to confirm it, cancel it or offer another available slot when those actions are enabled. An ambiguous caller or booking must be handed back as a follow-up request rather than changed by guesswork.

## Confirmation before a change

Identification may use the calling phone number, the customer's name and an appointment detail such as the service or time. These are not a universal identity guarantee. Ask for explicit final confirmation of the exact appointment and proposed action before applying it.

Your organization must decide the appropriate verification level for its context. The pilot is limited to administrative reception without health data; no medical or HDS qualification is claimed.

## Optional one-time code

The stricter policy requires a working delivery route and successful code verification before a change. The French Voice-only pilot line cannot send SMS. Do not enable an SMS-code requirement without a separately qualified sender and recipient flow. Do not weaken the policy simply to bypass a failed code.

## Calendar synchronization

After an approved change, check the application record and the external calendar separately. For cancellation, inspect the cancelled state and what happened to the selected Google event. For a move, check availability first, then verify the new time, duration and calendar event.

An internal success is not evidence of a delivered SMS or email. A network error leaves the result uncertain: inspect the existing appointment before retrying.

## Configure the controls

1. Open **Agent > AI settings** for the correct business.
2. Find **Appointment changes**.
3. Set cancellation and rescheduling permissions separately.
4. Choose the available verification policy only after checking its delivery prerequisites.
5. Save and reload to check the selected values.

## Qualification scenario

Create a fictitious appointment in a test calendar. Confirm the caller can only identify the intended booking, ask for a move or cancellation, explicitly confirm, then inspect both the application and Google. Also check ambiguous identity, disabled action, unavailable slot, wrong code and expired code where applicable.

Keep service descriptions, opening hours and Google authorization current. Until transfer is qualified, use a manual callback request for exceptions.

<CardGroup cols={2}>
  <Card title="Services" icon="calendar-check" href="/en/agent/services">Describe the appointment types and durations.</Card>
  <Card title="Google Calendar" icon="calendar" href="/en/integrations/google-calendar">Check writable calendars, renewal and external event results.</Card>
</CardGroup>
'''),
'agent/ai-settings/overview': ('Configure the greeting and booking policy', 'Greeting, fallback language, booking modes and transfer prerequisites.', '''
Open **Agent > AI settings** and verify the active business. These controls configure one receptionist; they do not create additional agents.

## Greeting

Use the business name and a short explanation of the help offered. Prepare the necessary information about AI and recording with the responsible operator. Do not promise an automatic callback, guaranteed appointment or unqualified action.

| Business | Example to adapt |
| --- | --- |
| Tradesperson | Hello, you have reached Example Repairs. I can answer practical questions or take a quote callback request. |
| Salon | Hello, you have reached Example Salon. How can I help with our services or an appointment request? |
| Administrative reception | Hello, you have reached the practice's reception. Please do not share medical details with this assistant. |

Edit **Greeting** and use its Save control. Make a new test call; an existing call keeps its starting context.

## Default customer language

The fallback values are English (`en`) and French (`fr`). Choose the language to use when the caller's language is unclear. This is a fallback rather than proof of a certified multilingual service. Add accurate knowledge and service wording in the languages your callers use, then test those languages.

Voice options depend on the controls actually exposed by your version. This guide does not promise voice cloning or an unprovided catalogue.

## Booking mode

Choose whether the receptionist does not book (`off`), takes requests for the team (`request`), or books immediately (`instant`). Check services, opening hours, closures, durations, staff assignment and the [selected Google calendar](/en/integrations/google-calendar).

A request is not a confirmed booking. Check the application result and Google before saying an event is confirmed externally. [Cancellation and rescheduling](/en/agent/ai-settings/appointment-changes) have separate policy and identity controls.

## Default transfer number

The transfer number is the potential destination of a live human handoff. Enter a complete number that your team controls, save it and describe the fallback in Rules. A saved number and permissive rule do not establish a working SIP transfer.

Human transfer remains unqualified in the pilot. Use a callback/follow-up request while unavailable. Test busy, no-answer and denied transfer states in a separately authorized qualification before relying on it. A callback request does not initiate an outbound call.

## Check a change

Save, reload the values and begin a new controlled call. Review the greeting, language, actual action result and call detail. A change does not rewrite historic transcripts or a call already in progress.
'''),
'integrations/google-calendar': ('Connect and verify Google Calendar', 'Choose a writable calendar, confirm the external result and qualify renewal separately.', '''
Google Calendar supplies availability and appointment synchronization when configured. Begin with a dedicated test calendar and add services before relying on booking.

## How it works

The application uses Google OAuth. You authorize an account, select a calendar and save that selection. The application can use busy-time information when offering slots and queues event synchronization for appointments. The database appointment and the Google event have separate status.

## Connect an account

1. Verify the business and your administrator role.
2. Open **Manage > Integrations**.
3. Select **Google Calendar**, then **Connect**.
4. Sign in to the intended Google account and review the requested permissions.
5. Return to Caléonis, open the Google card and choose the target calendar.
6. Save the calendar and inspect the connection state.

Choose a calendar where the account can create events. A calendar merely visible in the list may be read-only.

## Verify a booking

Configure the service, opening hours, duration, booking mode and **Europe/Paris** time zone. Make one authorized fictitious booking. Open the event directly in Google and compare the day, local time, duration and selected calendar.

A booking can be created without an attendee, SMS, email or operator alert. Do not infer a notification from an event. The successful pilot booking is evidence for that tested configuration, not every workspace.

## Durable authorization

Successful authorization immediately after consent does not demonstrate renewal. At the 15 October 2026 review, the pilot's Google OAuth project was reported in Testing with a seven-day renewal restriction still requiring operational work and requalification.

Have the operator verify refreshed access and another read or booking after renewal before promising durable service. Do not change the Google project or bypass its policy to hide a reconnection error.

## Change the selected calendar

Open Integrations, select the Google card, choose another writable calendar and save. The new selection affects future operations; it does not automatically move historical events. Notify the team before changing the calendar.

## Reconnect or disconnect

If the card requests reconnection, use the offered Reconnect action and authorize the correct account again. Check permissions and calendar selection, then verify a test operation before restoring customer booking.

Disconnecting removes the current connection; it must not be interpreted as deleting every existing Google event. Arrange manual handling during the interruption. Do not repeatedly recreate a booking while its external result is unknown.
'''),
'integrations/sms': ('SMS capabilities and consent', 'Voice-only limits, optional consent and the difference between queued and delivered notifications.', '''
The French pilot reception number is **Voice-only**. It neither sends nor receives SMS. This guide documents the controls and prerequisites without promising a French SMS offer or reusing the upstream US/Canada toll-free program.

## Separate the workflows

| Workflow | Prerequisites | Pilot state |
| --- | --- | --- |
| Appointment confirmation or reminder | Approved compatible sender, recipient consent and delivery qualification | Not provided by the Voice-only line. |
| Operator workspace alert | Verified operator phone, alert preference, consent and compatible sender | Must be qualified separately. |
| Manual SMS conversation | A business number able to receive and send SMS, permissions and compliant configuration | Unavailable on the pilot number. |
| Account verification code | The configured verification service and a mobile recipient | Separate from appointment and conversation SMS. |

The code can contain provider adapters without a sender being activated or legally approved for your business. Account verification does not add SMS to the reception line. The AI does not automatically reply to inbound SMS.

## Appointment customer consent

Ask for consent before recording an opt-in. A phone number in a booking is not permission to send a text. If the caller refuses, keep the booking and do not send a confirmation or reminder by SMS.

In the qualified no-SMS pilot booking, internal confirmation was `skipped`; no SMS, email or operator alert was sent for that booking. `skipped` is not delivery. A queued action is also not evidence of delivery.

## Operator preferences

Open **Settings > Notifications** and inspect the available controls. An SMS preference needs the verified recipient, disclosure and actual sender to be valid. Respect missing-sender, unverified-number and unavailable-capability states. Email and dashboard use do not require SMS opt-in.

## Delivery and withdrawal

If a separately authorized SMS service is introduced, verify consent records, sender capabilities, opt-out/help handling, suppression and provider delivery results before customer use. The upstream STOP/HELP wording and North American toll-free terms are not final French legal notices.

Do not send a real message merely to explore a setting. An authorized test must use your own recipient and inspect the provider result. See [Messages](/en/dashboard/messages), [Notifications](/en/settings/notifications) and [Availability](/en/support/availability).
'''),
'billing/plans': ('Plans and commercial conditions', 'Review an approved offer before payment, assignment or a new commitment.', '''
Caléonis prices, quotas and subscriptions remain **subject to approval**. The inherited plan names and catalogue values do not constitute a published Caléonis offer. A review must not trigger a live charge or a new commitment.

## What needs approval

The requested commercial target is the same numerical package amounts as the public upstream catalogue, denominated in EUR rather than a currency conversion. It requires an agreed catalogue, real EUR checkout configuration, minutes and overages, number eligibility, tax treatment and an operating-cost review.

No production charge is activated by this documentation. A euro symbol alone does not change a payment provider's currency.

## Confirm before subscribing

| Item | Confirmation needed |
| --- | --- |
| Monthly or annual amount | Approved numeric amount, EUR currency and billing period. |
| Included usage | Minutes, knowledge storage, test calls and any applicable limits. |
| Overage | Unit, price, cap, permission and reporting delay. |
| Number | Legal subscriber, assignment conditions, capabilities and recurring fees. |
| Features | Actually enabled and qualified for the business; no SMS on Voice-only. |
| Tax and contract | HT/TTC presentation, applicable VAT, sole-trader identity, payment and cancellation conditions. |
| Support | Scope, contacts and response commitments actually agreed. |

## Dashboard and checkout

The Settings plan/billing controls depend on the deployment and your role. Read the selected plan, period, amount and provider currency before confirming anything. If an inherited label conflicts with the approved proposal, stop the transaction and ask the operator to reconcile it.

Do not supply a card or complete a checkout to test the review. Sandbox checks must verify the provider receives `EUR` and correct minor-unit amounts; production payment activation is a separate approval.

## Change or cancel

Confirm the effective date, future invoices, usage treatment, number continuity and data retention before changing or ending a subscription. The upstream Free-plan number-release rule does not define the Caléonis contract.

See [Usage and costs](/en/billing/usage), [Phone number](/en/settings/phone-number), [SMS](/en/integrations/sms) and [Widget](/en/settings/widget).
'''),
'billing/affiliate-program': ('Affiliate-program availability', 'The inherited affiliate implementation is not an approved Caléonis program.', '''
The fork includes affiliate code and an upstream guide. No Caléonis commission rate, payout schedule, referral entitlement or eligibility condition has been approved for publication.

## During the pilot

Do not enroll prospects in an inherited program, generate a commercial referral link on that basis or reuse a LobbyStack referral destination as a Caléonis link. An interface entry does not itself open a program.

## Before a program could open

The operator would need to approve eligibility, attribution rules, commission basis, refunds and chargebacks, payout currency, tax documents, minimum payout, termination and accepted promotion practices. Referral tracking and payout handling would also need authorized sandbox qualification.

## Review an existing screen

If an affiliate page appears, inspect its state without entering payment data or recruiting a third party. Report any upstream brand, rate or destination that conflicts with the approved offer. A commission display is not proof of a payable debt or a completed transfer.

The original guide's program mechanics are deliberately not represented as current Caléonis terms. This is an explicit commercial exception to upstream parity. See [Plans](/en/billing/plans).
'''),
'billing/usage': ('Understand usage and costs', 'Periods, units, partial estimates, limits and billing verification.', '''
Voice can incur telephone-provider, AI, storage and hosting costs. A short real PSTN test can therefore cost money even when no customer subscription is being charged.

## Open usage

Use the usage/billing controls available in Settings for the active business. Check the reporting period, time zone, reset date and unit before comparing totals. Hosted controls and self-hosted provider accounts do not necessarily use the same billing period.

| Measure | What to verify |
| --- | --- |
| Call duration | Conversation time can differ from the carrier's billable time and rounding. |
| AI use | Depends on the model, metering and available cost data. |
| Phone number | Rental and assignment fees are separate from a conversation. |
| SMS | No sending or receiving on the French Voice-only pilot number. |
| Knowledge/storage | Documents and audio may be included in the displayed scope; verify units and limits. |
| Hosting | Infrastructure cost is distinct from customer usage charges. |

## Unknown costs and delayed synchronization

Unknown is not zero. A partial total is not a final invoice, and a saved call duration does not prove all supplier costs were collected. Price and usage refreshes may be delayed. Do not repeatedly call suppliers or place calls to force a refresh.

The summary model can differ from the conversation model; without a known price, its cost may remain unknown. Check the source and time of each cost value before drawing a margin conclusion.

## Included usage, caps and overages

Only limits approved for your offer are commitments. Inspect included units, consumption, spending caps, reset date and the behavior at the cap. The upstream Free/Starter/Pro allowances are not automatically Caléonis entitlements.

## Control tests

Use short scenarios, your own number and a test calendar. End a call that is no longer useful. A cap in one application view does not replace supplier-account spending controls or operational monitoring.

## Reconcile a bill

Compare the approved EUR catalogue, provider checkout currency, invoice period, measured usage, overage units and tax presentation. Report a discrepancy before making a new commitment. Do not claim savings, recovered revenue or a commercial return based on a handful of pilot tests.

See [Plans and conditions](/en/billing/plans).
'''),
'settings/account': ('Manage your account', 'Personal identity, access security and verification.', '''
Open **Settings > Account** to review the identity attached to your session. An account may belong to several businesses; verify the selected business separately from the person signed in.

## Review identity

Check the name and confirmed email. Use the available edit control and complete any requested verification. The [account setup guide](/en/getting-started/account-setup) covers business name, email change, password change, login and recovery in detail.

## Protect access

Use a unique password and your own account. Give other operators a [team invitation](/en/settings/team). Sign out on shared devices. If access is suspicious, change the password and have an administrator inspect members, API keys and connected applications.

## Verified phone

Complete phone verification only through the application flow. A verified mobile is not the business reception number and does not guarantee operator SMS alerts or add SMS to a Voice-only number.

## Data requests

Send access or deletion requests to the responsible business operator. Do not send passwords, tokens, recordings or unnecessary personal data to support. See [Privacy](/en/support/privacy).
'''),
'settings/notifications': ('Configure notifications', 'Event preferences, recipient checks and delivery evidence.', '''
Open **Settings > Notifications** for the intended business and operator. Select alerts that someone on your team is responsible for handling.

## Events

Available choices can include callbacks, new messages, booking activity, calendar synchronization issues and technical alerts. The visible controls depend on the workspace and version. Some preferences save immediately; reload and check their state.

## Email

Check the account address, intended recipient, sender configuration and delivery result with an authorized test. An enabled preference does not prove a valid sender or a delivered message. Transactional email is not an AI-managed email inbox.

## SMS

SMS alerts require a verified operator phone, a compatible approved sender and the required consent. Respect unverified-number, missing-sender and unavailable-capability states. The French Voice-only reception number does not provide SMS.

## Verify safely

Use your own recipient and one authorized event. Compare the application dispatch state with the provider result; queued, skipped and failed are different from delivered. Do not trigger tests to prospects or unrelated third parties.

Booking without SMS or email is possible. A customer's refusal of SMS must be preserved. See [SMS capabilities and consent](/en/integrations/sms).
'''),
'settings/team': ('Manage team invitations and roles', 'Give each operator a named account and the access needed for their work.', '''
Owners and administrators manage business access in **Settings > Team**. Invitations concern one business, not every business the inviter can access.

## Invite someone

1. Check the active business.
2. Choose Invite and enter the member's exact email.
3. Select the least-privileged role offered for the person's task.
4. Save and inspect the invitation and its state.
5. Have the recipient sign in with that same address.

The form can send a transactional email. A created invitation does not prove email receipt. Do not use a prospect or unrelated recipient for a test.

## Roles

| Role | Purpose |
| --- | --- |
| Owner | Workspace responsibility and extended management. |
| Administrator | Members and permitted business settings. |
| Viewer | Authorized reading without team administration. |

The current invitation form offers administrator and viewer. Other technical role names in the code are not a separate commercial team offer.

## Revoke access

Cancel a pending invitation when unnecessary. Remove a member whose access should end; the owner cannot be removed by this ordinary action. Then review the person's API keys and connected applications as appropriate. Do not assume removal revokes every external credential without checking.

## Verify isolation

Use authorized test accounts to confirm a member can access only the intended business and permitted actions. Keep logs and screenshots free of other customers' data.
'''),
'settings/phone-number': ('Review your business number', 'Check identity, capabilities and continuity before changes.', '''
Open **Settings > Phone number** and confirm the number belongs to the selected business.

## Capabilities

A number can support voice without supporting SMS. The French pilot line is **Voice-only**. Your account's verified mobile is separate and does not change the reception line's capabilities.

Inspect country, assigned number, capability labels and provider status where shown. A number listed in a search is not automatically eligible for legal assignment to another business.

## Test inbound calls

After authorized configuration, call from your own telephone. Confirm the intended business greeting and the saved call in the dashboard. Keep the scenario and test time so the operator can find the record. Change one setting at a time.

## Replace or release

A replacement can interrupt service, change costs and require documents. Confirm the legal holder, forwarding, publication of the number and rollback plan before approving it. Never release a customer-facing number as a test.

## Existing line and porting

See [Call forwarding](/en/support/phone-forwarding) for a reversible trial with your carrier. Codes and costs depend on the line. Porting, advanced routing and French assignment/subletting eligibility require separate approval. See the [number setup guide](/en/getting-started/claim-your-number).
'''),
'support/availability': ('Capabilities and qualification', 'What was tested, what needs qualification, and what is unavailable in the pilot.', '''
This table distinguishes implementation from an action actually tested in the French pilot. Review it before relying on a guide or opening a new customer workspace.

| Capability | State at the 15 October 2026 review | What remains to do |
| --- | --- | --- |
| Inbound PSTN conversation | Qualified on the approved pilot number | Qualify each new authorized configuration. |
| Transcript, summary, private recording playback | Qualified for the tested call | Check processing, permissions and retention for the workspace. |
| Google Calendar booking | Qualified on a dedicated test calendar | Verify service, time zone, rights and event for new workspaces. |
| Durable Google OAuth | Pending separate qualification | Verify refreshed access and an operation after renewal. |
| Human transfer | Pending qualification | End-to-end SIP, busy/no-answer, policy and fallback checks. |
| Cancellation/rescheduling | Code and controls present; not qualified by the booking test | Identity, confirmation, availability and external event checks. |
| SMS on pilot line | Unavailable: Voice-only | A distinct approved sender/service would require separate qualification. |
| Widget | Existing authorized keys only; new issuance off by default | Per-origin and per-business qualification. |
| API/MCP | Code present and scoped | Open only authorized access; qualify the specific integration. |
| Prices, affiliate program, live payments | Approval pending | Approved EUR catalogue, taxes, terms and provider sandbox. |
| Medical/HDS use | No qualification claimed | Limit the pilot to administrative reception without health data. |

A callback request is a task for your team. It does not place an automatic outbound call. A booking does not prove a delivered notification. Use [Troubleshooting](/en/support/troubleshooting) for an unexpected state.
'''),
'support/faq': ('Frequently asked questions', 'Practical answers about the French pilot, booking, messages and access.', '''
<AccordionGroup>
  <Accordion title="Does the receptionist use a real telephone number?">Yes, the qualified pilot receives PSTN calls through its approved voice number. Assignment and eligibility must be confirmed separately for each business.</Accordion>
  <Accordion title="Can I keep my existing number?">You can investigate forwarding with your current carrier. Its codes, costs and rollback are carrier-specific. Porting is a separate qualification.</Accordion>
  <Accordion title="Why is Messages empty?">The French pilot line is Voice-only and cannot receive SMS. Without an existing authorized widget conversation, an empty inbox is expected. Callback tasks are in call detail and dashboard follow-up.</Accordion>
  <Accordion title="Will a booking send a text or email?">Not automatically. The no-SMS pilot booking created an event without SMS, email or operator alert. Check consent, sender capabilities and actual dispatch/delivery separately.</Accordion>
  <Accordion title="Does Google stay connected indefinitely?">No such guarantee is made. Renewal and OAuth project configuration need separate durable-access qualification.</Accordion>
  <Accordion title="Can the assistant transfer a caller?">The code includes policy and transfer controls. The pilot's human-transfer chain remains unqualified; take a callback message while unavailable.</Accordion>
  <Accordion title="Does a callback request call the customer?">No. It records work for the team. No automatic outbound call is triggered by that request.</Accordion>
  <Accordion title="Is a browser call the same as a telephone call?">No. They are distinct entry paths and require their own authorization and verification.</Accordion>
  <Accordion title="Can I install the widget?">Only existing authorized keys are in scope. New key issuance is disabled by default; an implementation in the code is not public activation.</Accordion>
  <Accordion title="What are the plans?">The requested EUR catalogue and conditions remain subject to approval. Do not treat upstream plan names as an approved offer.</Accordion>
  <Accordion title="Can I use medical data?">The pilot is for administrative reception without health data. No HDS or medical qualification is claimed.</Accordion>
  <Accordion title="Where do I report an issue?">Record the business, your role, page, local test time and non-sensitive identifier. Follow the troubleshooting guide without sharing secrets or customer audio.</Accordion>
</AccordionGroup>

See [Availability](/en/support/availability), [Setup](/en/quickstart) and [Troubleshooting](/en/support/troubleshooting) for the full procedures.
'''),
'support/troubleshooting': ('Troubleshoot a pilot issue', 'Locate the affected step and collect useful evidence without repeating side effects.', '''
Check the active business, account role, page, filters and time zone first. Note the exact test time and non-sensitive call or appointment identifier. Do not publish recordings, credentials or customer information.

## Login or permissions

Use the correct account and confirmed email. Check whether an invitation is pending, expired or addressed to another identity. An access denial is not a reason to share an administrator password or reuse another business's key.

## Call missing or incomplete

Check filters and whether the call is still live or processing. Summary, transcript and recording can finish at different times. Confirm the called number and business greeting. Preserve the record identifier; do not place repeated PSTN calls to force processing.

## Audio unavailable

Open the call with an authorized session and allow normal processing. Compare processing, unavailable and failed states. See [Recordings](/en/support/recordings). A temporary signed URL is not a public sharing link.

## Booking or Google issue

Check mode, service, duration, opening hours, time zone, selected calendar, write access and synchronization state. Open Google directly. If the result is uncertain, inspect the existing event before repeating a booking. Use Reconnect only when required, then qualify a controlled operation.

## Messages or notifications

An empty inbox is expected without a supported active conversation source. Voice-only cannot send or receive SMS. Check consent and actual delivery state; skipped, queued and failed are not delivered. Email preferences do not prove sender configuration.

## Widget or browser call

Check an existing authorized key, exact origin, HTTPS, microphone permission and whether the requested feature is enabled. Do not issue a new key or weaken the origin allowlist as a workaround.

## API or webhook

Read the status, error code and Retry-After header. Verify business scope and permissions. Retry a creation with the same idempotency key and unchanged body. Validate webhook signatures against the raw body and inspect the delivery log.

## Escalate

Send the responsible operator the business, role, route, test time with time zone, expected action, observed state and sanitized identifier. Describe whether a side effect might already have happened. Keep a manual callback process while the issue is investigated.
'''),
'support/phone-forwarding': ('Prepare call forwarding', 'Run a reversible test with the current carrier before moving customer traffic.', '''
Call forwarding sends calls from your existing number to the approved reception number. It is configured with the current carrier, not by writing an agent rule.

## Before changing a line

Confirm ownership of both lines, destination, supported forwarding modes and carrier charges. Ask how unconditional, busy and no-answer forwarding behave on your plan. Keep the previous setting and the exact cancellation procedure.

French carrier codes vary by provider and line type. This guide intentionally does not publish a universal dial code or promise free forwarding. A US toll-free example is not a French routing instruction.

## Controlled test

1. Confirm the reception number already answers with the correct business greeting.
2. Choose a short authorized test window and inform the people handling the line.
3. Configure the carrier's approved forwarding setting.
4. Call the original number from an external test telephone.
5. Verify the greeting, call record and intended caller-number behavior.
6. Test the agreed rollback and confirm the original line works again.

Avoid a loop where the reception number transfers back to a line that forwards to it. Do not direct a test to an unrelated third party.

## Before real traffic

Review opening-hours behavior, unavailable-reception fallback, team handling and continuity. Forwarding is not number porting. Human transfer from the receptionist remains a separate qualification.
'''),
'support/recordings': ('Recordings and caller information', 'Private playback, processing states and retention responsibilities.', '''
Call detail can contain a transcript and a recording when audio is available. The qualified pilot verified private playback of a test call; availability still needs checking for each record.

## Open a recording

1. Sign in with a role allowed to read the business's calls.
2. Open **Calls**, select the intended call and inspect its time and identity.
3. Open Recording and wait for processing if indicated.
4. Play the audio from the authorized session and compare it with the transcript as needed.

Preparing, unavailable and failed are different states. A call can exist before its audio is ready. A transcription error does not necessarily mean the audio is wrong.

## Private access

The application uses controlled access and temporary object links for private files. Do not publish or forward a signed URL as a permanent public link. Do not attach customer recordings to a public bug report.

## Information and retention

The responsible business must establish the appropriate information for callers, purpose, access, retention and deletion process for its actual use. An agent rule is not by itself a complete compliance configuration. No legal approval or certification is established by this guide.

Use fictitious data for tests and restrict medical practices to administrative reception without health data. For access or deletion requests, follow the responsible operator's process and [Privacy](/en/support/privacy).

## Missing audio

Check the active business, role and processing state. Note the call identifier and test time without sharing the file. Follow [Troubleshooting](/en/support/troubleshooting) instead of making repeated paid calls.
'''),
'support/privacy': ('Privacy and access', 'Minimize collected information and use the responsible business process for data requests.', '''
The active business determines the scope of calls, contacts, appointments and messages visible to an authorized account. Keep access personal, role-limited and restricted to the intended business.

## Information to collect

Collect only what the reception task needs: necessary contact details, practical request and approved booking data. Use fictitious information for tests. Do not add health data, secrets, payment credentials or unnecessary personal details to pilot knowledge or call notes.

## Accounts and files

Use named accounts and revoke access when a member leaves. API keys, OAuth connections and widget keys are distinct credentials and need their own review. Keep recordings and documents private; do not publish temporary signed links.

## Requests from a person

Send access, correction or deletion requests to the responsible business operator. Verify identity through the organization's approved process and document the scope. Deleting one visible contact must not be assumed to delete all recordings, backups or external Google events.

## Operator and legal documents

Caléonis Receptionist is a service brand operated in the pilot by **William Fabrice Gosse, sole trader trading as MrManiac**. This help guide is not final terms of service, a privacy notice or an HDS certification. The appropriate contractual notices, processor relationships, retention and incident procedure require approval for the intended use.

## Report a problem

Give support sanitized identifiers and the event time. Never include a password, API key, OAuth token or customer audio in a public report. See [Troubleshooting](/en/support/troubleshooting) and [Recordings](/en/support/recordings).
'''),
'attributions': ('Attribution and provenance', 'Software licences, brand identity and screenshot provenance.', '''
Caléonis Receptionist adapts the open-source LobbyStack project. Internal package names and identifiers remain where compatibility requires them.

## Software and documentation

**Copyright (c) 2026 LobbyStack contributors — MIT License.** The root LICENSE and documentation NOTICE preserve the permission text and disclaimer. The inherited Mintlify documentation template also preserves **Copyright (c) 2023 Mintlify** in its own LICENSE.

The MIT grant covers the software and associated documentation under that licence. Third-party brands, embedded photographs and assets with separate rights need their own provenance review; repository presence alone is not evidence that a third-party trademark may become the Caléonis brand.

## Brand and operator

Caléonis Receptionist is the service brand. The pilot operator is **William Fabrice Gosse, sole trader trading as MrManiac**. This attribution page does not approve final contractual legal notices.

## Images

The Caléonis logos use the operator's local assets. The Messages desktop and mobile screenshots come from the real candidate application using fictitious data. Historical upstream Home, Calls, Messages and Analytics images remain in the Git source for provenance but are not displayed as Caléonis screenshots.

The page-by-page manifest records their original hashes and the necessary image exceptions. Replacing Home, Calls and Analytics illustrations requires authentic sanitized captures of those views; the Messages image is not substituted for another screen.

## Developer identifiers

The `@lobbystack/*` packages, `lsk_` key prefix and runtime environment variables are retained. Branding alone is not a reason to rename a secret, API field or package.

## Font and icon notices

The bundled Geist font is distributed by `@fontsource-variable/geist` under SIL Open Font License. Preview icons use `lucide-react` under ISC. The export preserves their local licence notices and the original Mintlify template notice.
'''),
}

for slug, (title, description, body) in EN.items():
    put('en/' + slug, title, description, body)

# The original skill was Markdown and not part of Mintlify's MDX file count.
# Preserve its complete operational workflow at the historical URL.
skill = git('mintlify/ai/lobbystack-skill.md')
skill = re.sub(r'^---\n[\s\S]*?\n---\n', '', skill)
skill = skill.replace('LobbyStack', 'Caléonis Receptionist')
skill = re.sub(r'\]\(/(?!en/)', '](/en/', skill)
skill = skill.replace('Set `sms_consent` to true only if the owner says the customer agreed to texts.', 'Set `sms_consent` to true only if the owner says the customer agreed to texts. The Voice-only pilot cannot send SMS; consent never bypasses capability checks, and a booking result never proves delivery.')
skill += '\n## Pilot qualification\n\nUse only actions authorized and qualified for the workspace. Human transfer, appointment changes, durable Google OAuth and new widget issuance are not qualified by the successful inbound-call and booking tests. Do not claim medical/HDS compliance or automatic outbound callbacks.\n'
put('en/ai/lobbystack-skill', 'Caléonis MCP instructions for AI assistants', 'Full tool reference, booking workflow, safe retries, opening hours and error handling.', skill)

# Compatibility with PR10's previous English entry point.
put('en/overview', 'Caléonis Receptionist help', 'Complete English help, operator guides and developer reference.', '''
The full English help centre mirrors the French guide coverage. Start with [Introduction](/en/introduction) and the [Setup guide](/en/quickstart).

<CardGroup cols={2}>
  <Card title="Daily operations" icon="file-lines" href="/en/dashboard/home">Calls, messages, contacts, appointments and follow-up work.</Card>
  <Card title="Configure the agent" icon="robot" href="/en/agent/overview">Greeting, knowledge, services and rules for one receptionist.</Card>
  <Card title="Integrations" icon="plug" href="/en/integrations/overview">Google Calendar, webhooks and exact SMS limitations.</Card>
  <Card title="Developer reference" icon="code" href="/en/api/overview">API, MCP, complete workflows and self-hosting.</Card>
</CardGroup>

Read [Capabilities and qualification](/en/support/availability) for the tested scope and pending actions. Read [Attribution](/en/attributions) for licences and asset provenance.
''')

print('English inherited guides and reviewed replacements restored.')

# Restore the complete native French source rather than summaries. Retain the
# already reviewed French operational exceptions for capabilities not offered.
FR_EXCEPTIONS = {
    'introduction', 'quickstart', 'getting-started/account-setup',
    'getting-started/claim-your-number', 'agent/ai-settings/overview',
    'agent/ai-settings/appointment-changes', 'integrations/google-calendar',
    'integrations/sms', 'billing/plans', 'billing/usage', 'billing/affiliate-program',
    'settings/account', 'settings/notifications', 'settings/phone-number', 'settings/team',
}


def adapt(content, language):
    content = content.replace('https://app.lobbystack.com', 'https://receptionist.caleonis.com')
    content = content.replace('https://docs.lobbystack.com', 'https://receptionist.caleonis.com/aide')
    content = content.replace('https://lobbystack.com', 'https://receptionist.caleonis.com')
    content = content.replace('https://github.com/lobbystack/lobbystack', 'https://github.com/PajuanDev/caleonis-reception')
    content = content.replace('https://lobbystack.example.com', 'https://receptionist.example.com')
    content = content.replace('app.lobbystack.com', 'receptionist.caleonis.com')
    content = content.replace('LobbyStack', 'Caléonis Receptionist')
    content = content.replace('cd lobbystack', 'cd caleonis-reception')
    content = re.sub(r'!\[[^\]]*\]\(/images/screenshots/[^)]+\)\n\n_[^\n]+_\n?', '', content)
    # Navigation is French at root and English under en; keep internal API and
    # OAuth metadata paths inside code blocks as literal application paths.
    if language == 'fr':
        content = content.replace('href="/fr/', 'href="/').replace('](/fr/', '](/')
        content = content.replace('](/ai/lobbystack-skill)', '](/ai/lobbystack-skill)')
        for old, new in [('courriel', 'email'), ('Courriel', 'Email'), ('clavardage', 'chat'), ('téléversés', 'importés'), ('téléverser', 'importer'), ('stationnement', 'parking')]:
            content = content.replace(old, new)
    return content


for path in (PUBLIC_SOURCE / 'fr').rglob('*.mdx'):
    slug = path.relative_to(PUBLIC_SOURCE / 'fr').as_posix().removesuffix('.mdx')
    if slug in FR_EXCEPTIONS:
        continue
    content = adapt(path.read_text(encoding='utf-8'), 'fr')
    target = DOCS / f'{slug}.mdx'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def append(slug, body):
    path = DOCS / f'{slug}.mdx'
    content = path.read_text(encoding='utf-8')
    # Rerunning this tool does not duplicate Caléonis-specific qualification text.
    content = content.split('\n{/* Caléonis qualification */}')[0].rstrip()
    path.write_text(content + '\n\n{/* Caléonis qualification */}\n\n' + body.strip() + '\n', encoding='utf-8')


# These pages preserve all upstream sections, examples, tables and snippets.
# Local qualifiers are specific to the deployed product, not a global disclaimer.
FR_NOTES = {
'agent/overview': '''## Périmètre Caléonis V1

Un seul agent est configuré par entreprise. Les rubriques IA, Connaissances, Services et Règles ne constituent pas un Agent Builder. Les modifications sont prises en compte dans les nouveaux échanges ; elles ne réécrivent pas un appel déjà commencé. Réalisez un nouveau test après enregistrement et traitement des sources.

Une prise de message est le repli pendant qu'un transfert reste indisponible. Elle n'initie aucun appel sortant automatique. Voir [Capacités et qualification](/support/availability).''',
'agent/knowledge': '''## Contrôler les sources et les limites de votre espace

Les quotas commerciaux publics de l'amont ne sont pas des quotas Caléonis approuvés. Consultez les limites réellement configurées et l'offre validée avant d'importer un volume important. Le formulaire et la version du déploiement définissent les formats et tailles acceptés.

Relisez le texte extrait, surtout pour un scan ou un tableau. Une entrée en attente ou en erreur n'est pas prête pour l'agent. Après une modification, posez une question précise dans un nouvel appel et vérifiez la transcription. Vous devez disposer des droits sur les sources. N'ajoutez pas de données de santé dans le pilote.''',
'agent/services': '''## Qualifier une prestation Caléonis

Un service peut être un rappel pour devis de 15 minutes ; cela ne promet ni intervention ni appel sortant automatique. Vérifiez sa durée, le mode de réservation, les horaires, les fermetures et le fuseau Europe/Paris avant le test. La description seule ne garantit pas une place disponible.

N'annoncez pas de prix, d'urgence ou d'intervention que votre équipe n'a pas validés. Les cabinets médicaux restent limités à l'accueil administratif sans données de santé.''',
'agent/rules': '''## Limites de capacité et qualification

Une règle n'active ni SMS sur une ligne Voice-only ni transfert SIP. Les exemples de transfert ne s'appliquent qu'après qualification du parcours téléphonique ; dans le pilote, prenez un message pour l'équipe. Les politiques structurées de réservation et d'identité restent prioritaires.

Pour vérifier une règle, testez le cas attendu puis le refus d'une action non autorisée. La réponse de l'agent doit annoncer le résultat réel. Ne promettez aucun rappel automatique ni livraison d'une notification sans preuve.''',
'dashboard/home': '''## Espace vide et suivi humain

Un espace neuf peut ne contenir aucune activité. Vérifiez l'entreprise et les filtres, puis effectuez un test autorisé. Une demande de rappel n'initie pas un appel sortant ; marquez le suivi terminé seulement après l'action réelle de votre équipe.

Les cartes dépendent des données et de la version déployée. Aucun screenshot historique LobbyStack n'est présenté ici comme une capture de l'application Caléonis.''',
'dashboard/calls': '''## Vérifier les résultats du pilote

Une transcription peut comporter des erreurs sur un nom ou une date. Le résumé ne prouve ni livraison SMS/email ni transfert humain. Le transfert du pilote reste à qualifier séparément.

L'audio est privé ; ne partagez pas une URL temporaire comme lien public. Si un élément manque, vérifiez rôle, entreprise et traitement puis consultez [Enregistrements](/support/recordings) et [Dépannage](/support/troubleshooting).''',
'dashboard/messages': '''## Numéro français Voice-only

Le numéro pilote ne reçoit ni n'envoie de SMS. La boîte Messages reste accessible mais peut être vide. La réponse manuelle est possible uniquement sur un canal réellement actif et avec les permissions requises ; respectez les états désactivés et SMS indisponible.

Une demande de rappel prise par téléphone se retrouve dans la fiche d'appel et le suivi, pas automatiquement dans un fil SMS. Les nouvelles clés de widget restent désactivées par défaut.

<Frame caption="Messages dans la vraie application candidate Caléonis, données fictives, ordinateur.">
  <img src="/images/screenshots/caleonis-messages-desktop.png" alt="Messages Caléonis avec indication Voice-only sur ordinateur" width="1440" height="1000" />
</Frame>

<Frame caption="Même page Messages de la candidate, vue mobile.">
  <img src="/images/screenshots/caleonis-messages-mobile.png" alt="Messages Caléonis sur mobile, SMS indisponible" width="390" height="844" />
</Frame>''',
'dashboard/contacts': '''## Identification et protection des données

Un visiteur Web peut ne pas avoir de téléphone ni d'email. Un appel masqué ou un nom ressemblant ne permettent pas d'identifier une personne avec certitude. Recherchez une fiche existante avant d'en créer une autre.

Un téléphone enregistré n'est pas un consentement SMS et ne change pas la capacité Voice-only. Ne testez pas le blocage sur une ligne client active : il peut interrompre la réception. Pour une demande de suppression, suivez le responsable de l'entreprise et [Confidentialité](/support/privacy).''',
'dashboard/appointments': '''## Demande, confirmation et résultat Google

Le mode `request` produit une demande à confirmer par l'équipe ; `off` interdit la réservation directe ; `instant` permet une confirmation si les conditions sont réunies. Une création dans l'application et une synchronisation Google sont distinctes : ouvrez l'événement directement dans l'agenda choisi et comparez le jour, l'heure, la durée et le fuseau.

Utilisez Europe/Paris, dont le décalage UTC varie selon la saison. Une réservation peut réussir sans invité, SMS, email ni alerte opérateur. Les changements de rendez-vous doivent être qualifiés séparément.''',
'dashboard/analytics': '''## Limites d'interprétation

Les résultats de quelques appels de test ne prouvent pas une performance commerciale. Comparez des périodes de durée et de fuseau identiques, puis ouvrez plusieurs fiches derrière les indicateurs. Une catégorie SMS dans un graphique ne fournit pas de SMS à un numéro Voice-only.

Les résultats de transfert décrivent des états enregistrés, pas une qualification de la chaîne téléphonique. Les statistiques ne sont ni une facture opérateur ni une estimation validée du chiffre d'affaires gagné.''',
'integrations/overview': '''## Disponibilité de chaque intégration

La réservation Google a été vérifiée dans un agenda de test ; la durabilité OAuth nécessite son propre contrôle. Les webhooks et l'API doivent être ouverts et testés pour votre intégration. Aucun SMS n'est disponible sur la ligne française Voice-only. Un adaptateur présent ne prouve pas une livraison à un tiers.''',
'integrations/webhooks': '''## Qualification et notifications

Choisissez un destinataire de test autorisé sans effet sur des clients. Un statut HTTP de livraison prouve la réception HTTP, pas toute l'action métier de votre CRM. Dédupliquez avant de rejouer un événement.

Les alertes annoncées par le code dépendent des préférences, d'un expéditeur configuré et de leur livraison effective. La ligne Voice-only ne peut pas fournir l'alerte SMS.''',
'api/overview': '''## Périmètre du déploiement Caléonis

Cette référence décrit le code et ses contrats. L'accès à chaque environnement et les actions d'écriture demandent l'autorisation du responsable de l'entreprise. Commencez par `GET /me` et une permission de lecture.

La ressource `messages` décrit les messages de suivi pris pour l'équipe ; elle ne constitue pas une API d'envoi SMS. Voir les [fiches complètes par opération](/api-reference/business/check-an-api-key) et [Capacités](/support/availability).''',
'api/authentication': '''## Compatibilité des permissions Caléonis

Conservez le préfixe `lsk_` et les identifiants internes. Les secrets ne doivent jamais être intégrés au widget, à une URL ou à du code navigateur. Vérifiez le refus d'une ressource d'une autre entreprise.

La version Caléonis documentée requiert `webhooks:manage` pour gérer les destinations. Les nouvelles restrictions d'abonnement par portée d'événement de l'amont ne sont pas déclarées actives sans modification du runtime.''',
'api/requests': '''## Notifications et compatibilité du runtime

Le numéro français Voice-only n'envoie pas de SMS. Un `sms_consent` vrai ne contourne aucune vérification de capacité et ne constitue pas une preuve de livraison. Après création ou changement, contrôlez l'application et Google séparément.

Les permissions d'API agissent pour l'entreprise et n'exécutent pas la vérification d'identité téléphonique d'un appelant. Limitez donc les clés d'écriture. Le modèle d'intervenants `staff` ne crée pas plusieurs agents IA métier.''',
'api/webhooks': '''## Validation Caléonis

Utilisez une destination autorisée et traitez durablement la déduplication sur `event.id` avant tout effet métier. L'extrait de vérification de signature n'est pas un consommateur complet prêt à traiter des données clients.

Une alerte d'échec requiert aussi un expéditeur et une livraison qualifiés. Ne déduisez pas un SMS de la mise en file d'une alerte. La création d'un abonnement ou un test peut envoyer un POST réel à un tiers.''',
'ai/mcp': '''## Qualification du SaaS

Ce serveur existant est une intégration développeur facultative ; il n'ajoute aucun Agent Builder ni agent métier supplémentaire. La description des jetons et permissions est un contrat technique du code, pas une preuve qu'un client tiers ou un renouvellement a été testé sur votre espace.

Vérifiez l'entreprise en lecture, le refus d'une action sans permission et la révocation. Les changements de rendez-vous, Google durable et notifications conservent leurs qualifications séparées. N'insérez pas de secret dans une conversation.''',
'ai/connect-claude': '''## Avant une utilisation réelle

Les configurations ci-dessus sont des exemples à adapter à la version de votre client, à son offre et au mode d'accès autorisé. Aucun abonnement tiers ni connecteur préinstallé n'est inclus par cette documentation. Vérifiez d'abord `get_business`, une action refusée et la révocation sur un espace de test.

Gardez les clés dans un gestionnaire de secrets ou une variable d'environnement, jamais dans une instruction de conversation. Les opérations d'écriture doivent être autorisées pour leurs effets réels.''',
'ai/connect-other-clients': '''## Vérifier le client et ses dépendances

Ces extraits conservent la structure de la documentation amont et doivent être adaptés aux versions installées. Ne lancez pas une commande `npx` sans vérifier la dépendance tierce retenue. Un client non compatible avec le transport et l'authentification de l'espace doit être refusé, pas contourné.

Une intégration réussie lit le bon espace, respecte les permissions et cesse de fonctionner après révocation. Un succès d'outil ne prouve ni événement Google synchronisé ni notification livrée.''',
'settings/overview': '''## Fonctions ouvertes et apparence

Les pages proposées dépendent du rôle, de la version et des capacités activées. Les réglages d'apparence peuvent contrôler langue, format horaire et thème ; vérifiez l'affichage après rechargement.

Les offres restent à approuver et les nouvelles clés widget sont restreintes. Après modification du numéro, du calendrier ou de la réservation, refaites le contrôle du parcours concerné avant usage client.''',
'settings/widget': '''## Exemple d'installation d'une clé existante

Copiez l'extrait exact fourni par votre écran ; les valeurs suivantes sont volontairement fictives :

```html
<script src="https://receptionist.caleonis.com/embed.js" data-widget-key="VOTRE_CLE_WIDGET_EXISTANTE" async></script>
```

Confirmez les attributs avec le snippet généré dans la version déployée avant installation. Une clé publique de widget n'est pas une clé API administrative. Vérifiez l'origine exacte, l'affichage ordinateur/mobile, le formulaire, le fil dans Messages, puis le refus sur une origine non autorisée.

Les nouvelles clés sont désactivées par défaut. Ce guide ne les active pas et ne promet pas le widget comme fonction publique de l'offre Caléonis V1.''',
'self-hosting/overview': '''## Instance indépendante et responsabilités

Les instructions concernent une installation indépendante avec vos propres comptes ; elles ne modifient pas la production Caléonis. PostgreSQL est le stockage canonique. Conservez la notice MIT LobbyStack et les noms internes utiles à la compatibilité.

Un démarrage sain n'est pas une qualification PSTN, Google, sécurité ou HDS. Vérifiez sauvegardes et restauration, isolation des entreprises et accès privés avant usage réel.''',
'self-hosting/docker-compose': '''## Périmètre d'exécution

N'exécutez ces commandes que dans votre installation indépendante. Ne réutilisez aucun secret, compte fournisseur ni destinataire client de la production Caléonis. Le générateur `--force` remplace des secrets et peut rendre les anciens accès ou données chiffrées inutilisables.

Un lancement ne doit pas déclencher involontairement d'email, d'achat de numéro, d'appel ou de paiement réel. Les changements de DNS/routage et la publication de la production Caléonis demandent une validation distincte.''',
'self-hosting/environment-variables': '''## Paramètres locaux supplémentaires

`WIDGET_KEY_ISSUANCE_ENABLED` reste désactivé par défaut pour les nouvelles clés. Le pilote utilise les paramètres Resend indiqués par `.env.example` lorsqu'ils sont configurés ; un tableau générique SMTP n'est pas une preuve de fournisseur activé.

Conservez les variables et packages `LOBBYSTACK_*`/`@lobbystack/*` ; le rebranding n'est pas une migration de secrets. Le fichier `.env.example` de votre commit fait foi. Ne placez aucun secret dans une variable `NEXT_PUBLIC_*`.''',
'self-hosting/providers': '''## Fournisseurs du pilote et limites

L'instance indépendante doit utiliser ses propres comptes et contrats. La production pilote peut utiliser Resend pour les emails transactionnels ; aucun email réel n'est envoyé par la lecture de ce guide. La facturation Polar demeure conditionnelle à l'approbation du catalogue et au mode test.

Un numéro Voice-only ne fournit pas les SMS. La présence d'un adaptateur de transfert ne qualifie pas le parcours SIP. Vérifiez aussi droits Google, renouvellement, accès privé S3 et restauration des sauvegardes.''',
}

for slug, body in FR_NOTES.items():
    append(slug, body)

# Remove statements that conflict with the actual Caléonis runtime instead of
# hoping a qualifier elsewhere will override a concrete false promise.
path = DOCS / 'agent/knowledge.mdx'
content = path.read_text(encoding='utf-8')
content = re.sub(r'<Note>\s*Les forfaits hébergés incluent[\s\S]*?</Note>', '<Note>Les quotas Caléonis sont ceux de votre offre approuvée et des contrôles de votre espace ; les anciens quotas commerciaux amont ne les définissent pas.</Note>', content, count=1)
path.write_text(content, encoding='utf-8')
path = DOCS / 'en/agent/knowledge.mdx'
content = path.read_text(encoding='utf-8')
content = re.sub(r'<Note>\s*Hosted knowledge[\s\S]*?</Note>', '<Note>Caléonis quotas are subject to the approved offer and workspace controls. Upstream plan quotas do not define a Caléonis entitlement.</Note>', content, count=1)
content = re.sub(r'<Note>\s*Hosted plans include[\s\S]*?</Note>', '<Note>Caléonis quotas are subject to the approved offer and workspace controls. Upstream plan quotas do not define a Caléonis entitlement.</Note>', content, count=1)
path.write_text(content, encoding='utf-8')

path = DOCS / 'api/authentication.mdx'
content = path.read_text(encoding='utf-8')
content = re.sub(r'Pour abonner un point de terminaison[\s\S]*?\n\n(?=##)', '', content)
path.write_text(content, encoding='utf-8')

path = DOCS / 'api/requests.mdx'
content = path.read_text(encoding='utf-8')
content = re.sub(r'`POST /webhooks` ignore cet en-tête[\s\S]*?\n\n', '* `POST /webhooks`\n\n', content)
content = re.sub(r'^\* Les nouvelles réservations se synchronisent[\s\S]*?(?=\n\*|\n\n)', '* Les nouvelles réservations mettent en file la synchronisation calendrier. Le numéro pilote Voice-only ne peut pas envoyer de SMS. Le consentement ne contourne aucune vérification de capacité ; contrôlez séparément tout état de notification.', content, flags=re.M)
content = re.sub(r' Quand vous annulez un rendez-vous à venir[^\n]+', '', content)
path.write_text(content, encoding='utf-8')

for language in ['fr', 'en']:
    prefix = '' if language == 'fr' else 'en/'
    slug = prefix + 'getting-started/number-countries'
    if language == 'fr':
        put(slug, 'Pays et attribution des numéros', 'Distinguer catalogue international amont et attribution française autorisée.', '''
## Périmètre français

La ligne du pilote Caléonis est une ligne française Voice-only, attribuée à l'entrepreneur individuel opérant sous le nom MrManiac après validation opérateur. Cette attribution ne prouve pas un droit automatique à fournir ou sous-louer un numéro français à une autre entreprise.

## Catalogue international de l'amont

LobbyStack annonce publiquement des numéros aux États-Unis et au Canada et prépare d'autres pays. Ces pays, essais gratuits et conditions ne constituent pas un catalogue Caléonis. Cette différence est une exception commerciale explicite à la parité.

## Avant un nouveau pays ou client

Confirmez le titulaire légal, les justificatifs, les conditions opérateur, le coût récurrent, les capacités voix/SMS, le trunk et la continuité. Un mobile vérifié dans un pays ne remplace pas ces contrôles. Ne lancez ni achat ni inscription à une liste d'attente tierce à partir de cette documentation.

Les appels navigateur sont un parcours distinct et ne fournissent pas un numéro PSTN. Voir [Numéro professionnel](/getting-started/claim-your-number) et [Capacités](/support/availability).
''')
    else:
        put(slug, 'Number countries and assignment', 'Separate the upstream international catalogue from authorized French assignment.', '''
## French pilot scope

The Caléonis pilot uses a French Voice-only line assigned to the sole trader operating as MrManiac after operator review. This does not establish an automatic right to supply or sublet French numbers to other businesses.

## Upstream international catalogue

LobbyStack publicly offers US and Canadian numbers and is adding other countries. Those countries, trial offers and eligibility rules are not a Caléonis number catalogue. This is an explicit commercial exception to parity.

## Before a new country or customer

Confirm the legal subscriber, documents, provider terms, recurring costs, voice/SMS capabilities, trunk configuration and continuity. A verified mobile in a country does not replace this review. Do not buy a number or register anyone on a third-party waitlist from this guide.

Browser calls are a separate path and do not supply a PSTN number. See [Business number](/en/getting-started/claim-your-number) and [Availability](/en/support/availability).
''')

print('Complete French native guide sections restored with explicit deployment exceptions.')

FR_DETAIL = {
'introduction': '''## Ce que le réceptionniste rassemble

- Les appels entrants sur le numéro attribué après validation opérateur.
- Un accueil enregistré et une langue de repli lorsque celle de l'appelant n'est pas claire.
- Les réponses factuelles issues de textes, de documents traités et de pages publiques autorisées.
- La prise de rendez-vous lorsque service, horaires, mode de réservation et agenda le permettent.
- Les demandes de rappel pour votre équipe, sans appel sortant automatique.
- Les résumés, transcriptions, enregistrements disponibles, contacts et rendez-vous dans le bon espace.
- Les accès techniques autorisés par API, MCP et webhooks, documentés séparément.

Les appels PSTN, la consultation privée d'un appel et une réservation dans un agenda Google de test ont été vérifiés dans le pilote. Chaque nouvel espace et chaque action non testée nécessitent leur propre contrôle.''',
'quickstart': '''## Parcours complet de préparation du compte

Lorsque l'inscription est autorisée, ouvrez [Inscription](https://receptionist.caleonis.com/signup) ou utilisez l'invitation reçue. Connectez-vous ensuite à [Connexion](https://receptionist.caleonis.com/login). Un formulaire accessible ne constitue pas une ouverture commerciale ni une attribution de numéro.

Préparez l'email personnel de l'opérateur, un mot de passe unique, le nom exact de l'entreprise et un site public autorisé. L'import du site peut être ignoré puis repris dans Connaissances. Les documents et textes peuvent également être ajoutés après l'accueil initial. Vérifiez leur traitement avant de les tester.

Complétez toute vérification d'email ou de téléphone de compte demandée par le parcours autorisé. Un code de vérification ne vaut pas consentement aux confirmations ou aux alertes SMS. L'offre et le numéro nécessitent une validation distincte ; ne terminez pas un checkout payant pour explorer cette revue.

Après le test, contrôlez le résultat exact, pas seulement la phrase de l'agent : fiche d'appel, rendez-vous enregistré, événement chez Google et état de notification. Pour le scénario sans SMS, une confirmation interne skipped ne doit pas être annoncée comme envoyée.''',
'getting-started/account-setup': '''## Créer un compte autorisé

1. Ouvrez [Inscription](https://receptionist.caleonis.com/signup) si les inscriptions sont ouvertes, ou suivez votre invitation nominative.
2. Saisissez votre email et un mot de passe fort respectant les contrôles affichés.
3. Soumettez le formulaire et terminez la vérification présentée.
4. Suivez le [démarrage](/quickstart) pour créer ou rejoindre l'entreprise attendue.

## Modifier les informations du compte

### Nom d'entreprise

Ouvrez Réglages > Compte, utilisez le champ de nom proposé et enregistrez. Vérifiez la nouvelle valeur. Un accueil personnalisé peut nécessiter sa propre modification dans Paramètres IA ; contrôlez un nouvel appel.

### Adresse email

Saisissez la nouvelle adresse dans le contrôle disponible et suivez la confirmation demandée. Tant que l'application ne confirme pas le changement, ne supposez pas que le nouvel email est devenu l'identifiant de connexion. Vérifiez la boîte ciblée et le dossier indésirable.

### Mot de passe

Utilisez le formulaire prévu, saisissez le mot de passe actuel si demandé, le nouveau et sa confirmation, puis enregistrez. Suivez les consignes concernant les sessions ; ne supposez pas que tous les appareils ont été déconnectés sans résultat explicite.

Une demande de récupération soumise ne prouve pas la livraison de l'email. N'envoyez jamais un mot de passe ni un lien de réinitialisation au support.''',
'getting-started/claim-your-number': '''## Séquence d'attribution autorisée

1. Faites confirmer le titulaire légal, les justificatifs et les conditions commerciales.
2. Attendez la validation opérateur applicable au numéro et au pays.
3. Contrôlez numéro, pays, zone, coût récurrent et capacités voix/SMS.
4. Faites terminer l'attribution et le routage SIP par l'opérateur autorisé.
5. Vérifiez le numéro dans Réglages > Numéro de téléphone pour la bonne entreprise.
6. Appelez depuis votre propre téléphone et contrôlez l'accueil et la fiche d'appel.

Les sélecteurs amont par ville, indicatif nord-américain ou numéro gratuit ne définissent pas un catalogue français. La règle amont de récupération après 30 jours sur un plan gratuit n'est pas une condition contractuelle Caléonis publiée. La portabilité nécessite une étude séparée ; le renvoi d'appels reste une configuration de votre opérateur actuel.

Ne validez ni achat ni remplacement pendant une simple revue. Voir [Pays et attribution](/getting-started/number-countries).''',
'agent/ai-settings/overview': '''## Exemples d'accueil et langue de repli

| Activité | Texte à adapter |
| --- | --- |
| Artisan | Bonjour, vous êtes chez Exemple Dépannage. Je peux vous renseigner ou prendre une demande de rappel pour devis. |
| Salon | Bonjour, vous êtes chez Exemple Salon. Comment puis-je vous aider concernant nos prestations ou une demande de rendez-vous ? |
| Accueil administratif | Bonjour, vous êtes à l'accueil du cabinet. Merci de ne pas communiquer de détails médicaux à cet assistant. |

Les valeurs de repli prévues sont français (`fr`) et anglais (`en`). Ce réglage s'utilise lorsque la langue de l'appelant est incertaine ; il ne constitue pas une certification linguistique. Renseignez les sources utiles dans les langues de vos appelants et testez-les.

## Numéro de transfert et repli

Le champ désigne la destination potentielle du transfert humain. Utilisez un numéro complet que votre équipe contrôle, enregistrez et prévoyez la prise de message dans Règles. Une qualification distincte doit couvrir transfert accepté, occupé, absence de réponse et refus par la politique. Tant qu'elle manque, l'agent doit prendre un message.

Les modes de réservation internes sont `off`, `request` et `instant`. Dans le mode demande, votre équipe doit confirmer ; aucune phrase de l'agent ne doit convertir cette demande en confirmation.''',
'agent/ai-settings/appointment-changes': '''## Actions et confirmation attendues

Le parcours peut retrouver un rendez-vous à venir, demander confirmation, annuler ou proposer un autre créneau lorsque l'action est autorisée. Une demande vague ne doit pas provoquer de changement : faites confirmer service, date, heure locale et action exacte.

La politique peut utiliser téléphone, nom et détail du rendez-vous. Ces éléments ne constituent pas une garantie universelle d'identité. En cas d'ambiguïté, recueillez une demande de suivi pour l'équipe.

## Activer les contrôles séparément

1. Ouvrez Agent > Paramètres IA pour la bonne entreprise.
2. Recherchez les changements de rendez-vous.
3. Réglez séparément annulation et déplacement.
4. Choisissez la vérification après avoir validé son moyen de livraison.
5. Enregistrez et vérifiez les valeurs après rechargement.

Pour une annulation, relisez le statut et l'effet exact sur l'événement Google. Pour un déplacement, contrôlez le nouveau créneau, la durée et l'agenda. Vérifiez aussi code faux ou expiré lorsque cette politique s'applique. Conservez les services et les droits calendrier à jour.''',
'integrations/sms': '''## Consentement client lors d'une réservation

Demandez l'accord avant de conserver un opt-in ; le téléphone du contact ne suffit pas. Si l'appelant refuse, gardez le rendez-vous et n'envoyez ni confirmation ni rappel SMS. Le consentement ne peut pas donner une capacité SMS à une ligne Voice-only.

Lors du test pilote sans SMS, l'événement Google a été créé sans invité ; la confirmation interne était skipped et aucun SMS, email ou alerte opérateur n'a été envoyé pour cette réservation. Vérifiez séparément tout autre scénario.

## Désabonnement, aide et future ouverture

L'éventuelle ouverture d'un service distinct nécessiterait validation du pays, de l'expéditeur, des coûts, des preuves de consentement, de la suppression des destinataires opposés et du résultat fournisseur. Les anciens textes STOP/HELP et conditions nord-américaines ne sont pas présentés comme les mentions françaises finales.

L'email et le tableau de bord restent des parcours distincts ; n'utilisez pas un autre canal pour contourner un refus de notification. Un test d'envoi nécessite un destinataire personnel autorisé et le contrôle du résultat réel.''',
'billing/plans': '''## Catalogue et devise à approuver

La cible demandée est de reprendre les mêmes montants numériques et volumes que le catalogue public amont, en EUR. Cette cible doit être réconciliée avec le catalogue backend, les frais de dépassement, l'attribution légale des numéros, les coûts opérateur/IA et les taxes avant ouverture.

Un symbole € ne change pas la devise facturée. Un contrôle en sandbox doit vérifier la devise EUR, les montants en unités mineures et la période reçus par le prestataire. Aucune charge réelle n'est activée par cette documentation.

| Point contractuel | À confirmer |
| --- | --- |
| Prix et période | Montant EUR, mensuel/annuel, présentation HT/TTC. |
| Usage | Minutes incluses, unité de dépassement, plafonds et date de remise à zéro. |
| Numéro | Titulaire légal, capacités, justificatifs et frais récurrents. |
| Paiement | Prestataire, calendrier, taxes/TVA et conditions de résiliation. |
| Fonctions | Seulement les fonctions activées et qualifiées pour l'espace. |
| Support | Périmètre et engagements réellement approuvés. |

Avant un changement ou une résiliation, confirmez date d'effet, factures futures, usage restant, continuité du numéro et conservation des données. Les conditions héritées de l'amont ne remplacent pas celles de l'EI exploitante.''',
'billing/usage': '''## Volumes inclus, plafonds et rapprochement

Les contrôles disponibles peuvent afficher consommation, usage restant, date de remise à zéro et plafond. Vérifiez la période et l'unité avant toute comparaison. Un plafond applicatif ne remplace pas les contrôles de dépense des comptes fournisseurs.

Pour rapprocher une facture, comparez l'offre EUR approuvée, la devise du checkout, la période, les unités mesurées, les dépassements et les taxes. Le modèle de résumé d'appel peut différer du modèle de conversation ; son coût reste inconnu si aucun prix applicable n'est disponible.

Un total partiel n'est ni zéro dépense ni une marge réelle. Les nouveaux prix et usages peuvent être synchronisés avec retard ; n'effectuez pas d'appels ou contrôles fournisseur répétés pour les forcer.''',
'billing/affiliate-program': '''## Conditions nécessaires avant une ouverture

Il faudrait approuver éligibilité, attribution des recommandations, assiette de commission, remboursements et contestations, devise, pièces fiscales, seuil et calendrier de paiement, résiliation et pratiques de promotion admises. Le suivi et le paiement devraient aussi être qualifiés en mode test.

Si un écran apparaît, contrôlez son état sans renseigner de coordonnées de paiement ni recruter de tiers. Un taux ou solde affiché n'est pas la preuve d'une créance ou d'un virement. La mécanique commerciale de l'amont reste une exception explicite tant qu'aucun programme Caléonis n'est validé.''',
}

for slug, body in FR_DETAIL.items():
    # Sensitive FR pages intentionally do not use FR_NOTES, so they have one
    # qualification appendix. Preserve the complete reviewed base page.
    append(slug, body)

# English retains the same local qualification as the detailed French pages.
EN_NOTES = {
'dashboard/home': '## Empty workspaces and human follow-up\n\nCheck the active business and filters before interpreting an empty view. A callback task does not initiate an outbound call. Mark it complete only after the team actually follows up. Cards depend on the version and available data.',
'dashboard/calls': '## Pilot result checks\n\nA summary does not prove notification delivery or human transfer. The transfer chain remains unqualified. Review audio privately with an authorized session; never publish temporary signed links. See [Recordings](/en/support/recordings) and [Troubleshooting](/en/support/troubleshooting).',
'dashboard/messages': '''## French Voice-only line

The pilot number cannot send or receive SMS. Messages remains accessible and may be empty. Manual replies require an active supported channel and permission; respect unavailable and disabled states. A callback request from a telephone call belongs to call detail and dashboard follow-up, not automatically an SMS thread. New widget issuance is off by default.

<Frame caption="Real Caléonis candidate Messages page with fictitious data; the application UI is French."><img src="/images/screenshots/caleonis-messages-desktop.png" alt="Caléonis Messages desktop, Voice-only SMS unavailable" width="1440" height="1000" /></Frame>
<Frame caption="The same candidate Messages page on mobile; French UI."><img src="/images/screenshots/caleonis-messages-mobile.png" alt="Caléonis Messages mobile, SMS unavailable" width="390" height="844" /></Frame>''',
'dashboard/contacts': '## Identity and data protection\n\nA web visitor may have neither email nor phone. Similar names or withheld caller identity are not reliable matches. A recorded phone is not SMS consent and does not change Voice-only capability. Blocking can interrupt incoming calls; do not test it on a customer line. Follow the responsible operator for deletion requests.',
'dashboard/appointments': '## Requests and external confirmation\n\nThe `request` booking mode requires team confirmation; `off` does not book, and `instant` is subject to availability and policy. Verify the application record and Google event separately, with the business time zone. A successful booking does not establish SMS, email or operator-alert delivery. Appointment changes need their own qualification.',
'dashboard/analytics': '## Interpretation limits\n\nA few pilot calls do not demonstrate commercial performance. Compare equal periods and time zones, then open calls behind the totals. An SMS chart category does not add SMS to a Voice-only line. Transfer outcomes are recorded states, not proof of a qualified transfer chain. Analytics is not a carrier invoice or recovered-revenue calculation.',
'agent/overview': '## One receptionist per business\n\nThese pages configure one agent. There is no multi-agent catalogue or Agent Builder in V1. Changes are used for new conversations; begin a new test after saving and processing. A fallback callback task does not start an automatic outbound call.',
'agent/knowledge': '## Source and workspace checks\n\nThe form and deployed version define accepted formats and file sizes. Review extracted text, especially scans and tables, and wait until processing is ready. Use only authorized source material and no health data in the pilot. Test the changed answer in a new call.',
'agent/services': '## Qualify the service\n\nA 15-minute quote callback does not promise an onsite job or automated outbound call. Check duration, hours, closures, booking mode and Europe/Paris time zone. Do not promise unapproved prices or emergency coverage. Medical practices are limited to administrative reception without health data.',
'agent/rules': '## Capability limits\n\nTransfer examples apply only after separate end-to-end qualification; use callback/follow-up requests while transfer is unavailable in the pilot. A text rule cannot enable SMS on Voice-only or bypass structured booking and identity policies. Test the expected result and a denied action; report the actual action outcome.',
'integrations/overview': '## Availability\n\nThe pilot qualified one Google booking on a test calendar; durable authorization needs a separate check. Qualify your specific webhook/API integration. The French Voice-only line provides no SMS, and a provider adapter does not establish delivery.',
'integrations/webhooks': '## Delivery and alerts\n\nUse an authorized endpoint with no customer side effects for testing. An HTTP success establishes HTTP receipt, not the entire CRM business action. Deduplicate before resending. Operator alerts require configured senders and actual delivery; Voice-only cannot provide an SMS alert.',
'api/overview': '## Caléonis deployment scope\n\nThis reference describes the implemented contract. Access and writes require the business operator’s authorization. Start with GET /me and read-only scopes. The messages resource contains team follow-up messages, not an SMS sending API. See [Operation reference](/en/api-reference/business/check-an-api-key).',
'api/webhooks': '## Consumer qualification\n\nThe signature example is not a complete production consumer. Validate the event, deduplicate durably before side effects, and confirm storage before acknowledging. Failure alerts also require configured delivery. Creating a subscription or sending a test makes an actual HTTP request to its endpoint.',
'ai/mcp': '## SaaS qualification\n\nThis optional developer integration does not create additional business agents. Token and scope details describe code behavior; they do not prove a third-party client or renewal has been tested for the workspace. Verify the business, denied permissions and revocation. Appointment changes, durable Google access and notifications retain separate qualification.',
'ai/connect-claude': '## Client versions and approval\n\nThese configurations are templates for the installed client and authorized access mode. No third-party subscription or preinstalled connector is promised. Verify get_business, a denied action and revocation on a test workspace. Keep secrets out of conversation instructions and authorize the actual effects of writes.',
'ai/connect-other-clients': '## Verify client and dependencies\n\nAdapt the examples to installed versions. Verify a third-party dependency before running npx. A successful connection reads the correct business, respects scopes and stops after revocation; it does not prove Google synchronization or notification delivery.',
'settings/overview': '## Enabled features\n\nPages depend on role, version and enabled capabilities. Appearance controls may set language, time format and theme; check the result after reload. Commercial plans remain subject to approval and new widget keys are restricted. Requalify number, calendar and booking changes before customer use.',
'settings/widget': '''## Existing-key installation example

Copy the exact snippet generated by your deployed page. This template deliberately uses a fictitious value:

```html
<script src="https://receptionist.caleonis.com/embed.js" data-widget-key="YOUR_EXISTING_WIDGET_KEY" async></script>
```

Verify the exact origin, desktop/mobile layout, lead form, thread in Messages and denial on an unapproved origin. A public widget key is not an administrative API key. New issuance remains off by default and this guide does not activate it as a public V1 entitlement.''',
'self-hosting/overview': '## Independent deployment\n\nUse your own accounts and secrets; these instructions do not administer the Caléonis production service. PostgreSQL is canonical. Preserve the MIT notice and internal package names. Startup alone is not PSTN, calendar, security or medical/HDS qualification. Verify backup restore, business isolation and private access.',
'self-hosting/docker-compose': '## Execution scope\n\nRun only in your independent installation. Do not reuse production Caléonis secrets, provider accounts or customer recipients. --force replaces secrets and may invalidate stored credentials. Avoid unintended messages, number purchases, real calls and charges while preparing the stack. Production DNS/routing remains a separate approval.',
'self-hosting/environment-variables': '## Additional local controls\n\nWIDGET_KEY_ISSUANCE_ENABLED is off by default for new keys. The pilot may use Resend parameters from .env.example; a generic SMTP table does not prove a configured sender. Keep LOBBYSTACK_* variables and @lobbystack/* package names. The .env.example of the deployed commit is authoritative; no secret belongs in NEXT_PUBLIC_*.',
'self-hosting/providers': '## Pilot boundaries\n\nAn independent deployment needs its own accounts and contracts. The pilot can use Resend for transactional email; reading this guide sends nothing. Live billing remains conditional on an approved catalogue and sandbox qualification. Voice-only provides no SMS, and an adapter does not qualify SIP transfer. Verify Google renewal, private S3 access and restoration.',
}

for slug, body in EN_NOTES.items():
    append('en/' + slug, body)

print('French operational detail and matching English deployment qualifications complete.')

put('ai/lobbystack-skill', 'Consignes MCP complètes pour les assistants IA', 'Outils, recherches, réservations, horaires, idempotence et traitement des erreurs.', '''
Cette route historique conserve les instructions du socle MIT sous marque Caléonis Receptionist. Une connexion MCP voit une seule entreprise et seulement les outils permis par la clé ou le consentement OAuth. Ce guide développeur ne crée pas de nouveaux agents métier dans l'application.

## Avant toute action

- Appelez `get_business` pour connaître `timezone`, `hours` et `booking_mode`.
- Les réponses utilisent ISO 8601 en UTC. Affichez l'heure dans le fuseau de l'entreprise et renvoyez le `starts_at` du résultat sans l'inventer.
- Avant une écriture ayant un effet réel, faites confirmer client, service, date et heure locale, et action autorisée.
- N'inventez aucun identifiant ; obtenez chaque `*_id` d'un résultat précédent.
- Respectez les limites de capacité : pas de SMS sur Voice-only, pas de transfert ou de modification non qualifiés, aucun rappel automatique implicite.

## Outils et permissions

| Outil | Permission | Utilité |
| --- | --- | --- |
| `get_business` | `business:read` | Nom, fuseau, horaires et mode de réservation. |
| `list_services` | `business:read` | Identifiants et durées des services. |
| `list_staff` | `business:read` | Intervenants et services pris en charge. |
| `update_business_hours` | `business:write` | Remplacer les horaires de la semaine entière. |
| `list_calls` | `calls:read` | Lister les appels par date de début. |
| `get_call` | `calls:read` | Lire un appel et sa transcription. |
| `search_contacts` | `contacts:read` | Chercher téléphone, email ou partie d'un nom. |
| `get_contact` | `contacts:read` | Lire un contact identifié. |
| `create_contact` | `contacts:write` | Ajouter un contact. |
| `update_contact` | `contacts:write` | Corriger ou vider les champs permis d'un contact. |
| `list_appointments` | `appointments:read` | Filtrer les rendez-vous par statut, heure ou contact. |
| `get_appointment` | `appointments:read` | Lire un rendez-vous. |
| `check_availability` | `appointments:read` | Obtenir des débuts de créneaux disponibles. |
| `book_appointment` | `appointments:write` | Réserver un créneau autorisé. |
| `cancel_appointment` | `appointments:write` | Annuler le rendez-vous confirmé par l'opérateur. |
| `reschedule_appointment` | `appointments:write` | Déplacer vers un autre créneau disponible. |
| `list_messages` | `messages:read` | Lire les messages de suivi pris pour l'équipe. |
| `add_knowledge` | `knowledge:write` | Ajouter une FAQ ou un texte factuel. |

Les listes paginées renvoient `data`, `next_cursor` et `has_more`. Tant que `has_more` vaut vrai, répétez les mêmes filtres avec `cursor` égal au `next_cursor` retourné.

## Rechercher un appelant

1. Avec un téléphone, appelez `search_contacts` en format E.164, par exemple `+33600000000` comme valeur fictive de syntaxe.
2. Sinon, recherchez une partie du nom, sans distinguer majuscules et minuscules.
3. Si plusieurs personnes correspondent, demandez laquelle. Utilisez les appels ou rendez-vous pour les distinguer sans fusionner par supposition.
4. Utilisez uniquement l'identifiant effectivement retourné.

## Vérifier puis réserver un créneau

1. Lisez l'entreprise ; `booking_mode` doit être `instant` pour réserver directement.
2. Lisez les services et choisissez celui demandé par l'opérateur.
3. Appelez `check_availability` avec `service_id` et `start_date` au format `YYYY-MM-DD` dans le fuseau de l'entreprise. La plage avec `end_date` ne dépasse pas sept jours.
4. Si une personne précise est demandée, lisez `list_staff`, puis passez le même `staff_id` à la disponibilité et à la réservation.
5. Proposez quelques créneaux en heure locale. Après choix et confirmation autorisés, utilisez leur `starts_at` exact et le `contact_id` ou `contact_phone` vérifié.
6. Ne mettez `sms_consent` à vrai qu'après accord réel du client ; cela ne débloque pas un SMS Voice-only et ne prouve aucun envoi.
7. Envoyez une `idempotency_key` unique. Après un timeout, reprenez avec la même clé et les mêmes paramètres pour éviter un doublon.
8. Contrôlez le résultat applicatif et la synchronisation Google. N'annoncez pas de notification sans résultat distinct.

Pour déplacer, vérifiez à nouveau les disponibilités du service et de l'intervenant, puis appelez `reschedule_appointment` après autorisation. Sans nouveau `staff_id`, l'intervenant reste le même. Pour les réservations d'un contact, filtrez `list_appointments` sur `contact_id`.

## Retrouver les appels d'hier à suivre

1. Lisez le fuseau via `get_business`.
2. Calculez les deux minuits locaux entourant hier avec leur décalage UTC, en tenant compte des changements d'heure.
3. Listez les appels avec `started_after` et `started_before`, puis toutes les pages utiles.
4. Les résultats `message_taken`, `booking_incomplete` et `none` peuvent demander un suivi. `appointment_booked` désigne le résultat applicatif enregistré, pas une notification livrée.
5. Lisez `list_messages` avec `status: open` et rapprochez les messages avec `call_id`.
6. Ouvrez `get_call` seulement pour les transcriptions nécessaires : elles peuvent être longues.

Une demande de rappel constitue une tâche humaine, sans appel sortant automatique.

## Mettre à jour les horaires

Lisez d'abord `hours`, modifiez seulement les jours demandés et renvoyez la semaine complète dans `update_business_hours`. Un jour omis devient fermé. Utilisez `HH:MM` sur 24 heures dans le fuseau de l'entreprise et `24:00` pour minuit. Faites confirmer l'ensemble avant remplacement.

## Ajouter une FAQ

Pour `type: faq`, utilisez une `question` comme la poserait un appelant et une `answer` factuelle. Pour une politique ou un texte plus long, utilisez `type: text`, `title` et `content`. N'inventez pas de faits, tarifs ou conditions absents des informations de l'opérateur. Les instructions de comportement appartiennent aux règles, pas à une FAQ.

## Modes de réservation

| Mode | Comportement |
| --- | --- |
| `instant` | Réservation directe seulement après disponibilité, permissions et confirmation. |
| `request` | L'équipe confirme les demandes ; ne réservez pas par contournement. |
| `off` | Réservation désactivée ; expliquez le refus. |

La création et le déplacement refusent respectivement avec `booking_requires_confirmation` ou `booking_disabled`. L'annulation existe pour tous les modes mais reste une écriture à autoriser et qualifier.

## Traiter les erreurs

Une erreur d'outil est marquée comme telle et contient le JSON `{ "error": { "code": "...", "message": "..." } }`.

| Code | Action |
| --- | --- |
| `invalid_request` | Corriger les arguments à partir de `message` et `details`. |
| `not_found` | Rechercher dans la bonne entreprise ; ne pas deviner d'identifiant. |
| `conflict` | Lire le conflit, par exemple un téléphone déjà enregistré. |
| `slot_unavailable` | Rechercher de nouvelles disponibilités et les reproposer. |
| `booking_requires_confirmation`, `booking_disabled` | Arrêter et expliquer le mode de réservation. |
| `idempotency_key_reused` | Une opération différente a besoin d'une nouvelle clé ; une reprise garde son contenu initial. |
| `rate_limited` | Attendre le délai demandé puis reprendre une fois. |
| `rate_limit_unavailable` | Attendre puis reprendre une fois sans désactiver les protections. |
| `internal_error` | Reprendre une fois ; en cas de nouvel échec, transmettre la référence au responsable. |

Un outil absent peut indiquer une permission manquante. Expliquez la portée requise ; ne cherchez pas à contourner les droits. Faites reconnecter le client avec l'accès autorisé ou créer une clé appropriée dans Réglages > Clés API. Voir [MCP](/ai/mcp), [Authentification](/api/authentication) et [Erreurs](/api/requests).
''')

for language in ['fr', 'en']:
    prefix = '' if language == 'fr' else 'en/'
    path = DOCS / f'{prefix}ai/connect-chatgpt.mdx'
    content = path.read_text(encoding='utf-8')
    if language == 'fr':
        replacement = '''## ChatGPT

Vérifiez dans votre version de ChatGPT que l'ajout d'un serveur MCP distant est disponible et autorisé par votre organisation. Les menus et offres de ce logiciel tiers ne constituent pas une fonction incluse de Caléonis.

1. Ouvrez le parcours d'ajout MCP proposé par votre version.
2. Saisissez `https://receptionist.caleonis.com/api/mcp` et le mode d'authentification effectivement ouvert dans votre espace.
3. En cas de consentement OAuth, vérifiez l'entreprise et limitez les permissions.
4. Testez `get_business`, un refus d'action sans permission et la révocation.

La documentation officielle des [connexions MCP OpenAI](https://developers.openai.com/api/docs/guides/tools-connectors-mcp) précise les paramètres API. La connexion du SaaS avec chaque client doit être qualifiée séparément. Ne collez jamais une clé dans une conversation.

'''
    else:
        replacement = '''## ChatGPT

Check that your installed ChatGPT version and organization permit adding a remote MCP server. Third-party menus and plans are not a Caléonis entitlement.

1. Open the MCP connection flow offered by your version.
2. Enter `https://receptionist.caleonis.com/api/mcp` and the authentication mode actually enabled for your workspace.
3. If OAuth consent is shown, verify the business and limit permissions.
4. Test `get_business`, a denied action and revocation.

The official [OpenAI MCP documentation](https://developers.openai.com/api/docs/guides/tools-connectors-mcp) describes API parameters. Each SaaS/client connection needs separate qualification. Never paste a key into a conversation.

'''
    content = re.sub(r'## ChatGPT\n[\s\S]*?(?=## (?:API Responses|OpenAI Responses))', replacement, content)
    content += '\n' + ('Référence officielle pour la configuration Codex : ' if language == 'fr' else 'Official Codex configuration reference: ') + '[MCP](https://developers.openai.com/codex/mcp).\n'
    path.write_text(content, encoding='utf-8')

path = DOCS / 'api/webhooks.mdx'
content = path.read_text(encoding='utf-8').replace('`webhooks:manage` et la portée de chaque événement choisi', '`webhooks:manage`')
content = content.replace('| `data` | Portée |', '| `data` | Portée de lecture de la ressource |')
path.write_text(content, encoding='utf-8')

for path in DOCS.rglob('*.mdx'):
    if 'node_modules' in path.parts:
        continue
    content = path.read_text(encoding='utf-8')
    content = content.replace('app.lobbystack.com', 'receptionist.caleonis.com')
    content = content.replace('https://receptionist.caleonis.com/fr/essai', 'https://receptionist.caleonis.com/signup')
    path.write_text(content, encoding='utf-8')

config_path = DOCS / 'docs.json'
config = json.loads(config_path.read_text(encoding='utf-8'))
config['navbar']['primary']['href'] = 'https://receptionist.caleonis.com/signup'
config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

for language in ['fr', 'en']:
    path = DOCS / ('agent/ai-settings/overview.mdx' if language == 'fr' else 'en/agent/ai-settings/overview.mdx')
    content = path.read_text(encoding='utf-8').split('\n{/* Latest upstream settings differences */}')[0].rstrip()
    body = '''
## Résumé de l'entreprise

La nouvelle interface candidate de cette PR expose le résumé manuel déjà pris en charge par le backend. Renseignez des faits approuvés dans Résumé de l'entreprise, enregistrez puis vérifiez un nouvel appel. Cette interface candidate ne constitue pas une mise à jour de la production précédemment qualifiée.

L'amont récent ajoute génération automatique depuis les connaissances et bouton de réécriture IA. Ces deux automatismes ne sont pas implémentés dans cette candidate ; aucun bouton factice n'est présenté. Les Connaissances restent la source des informations à vérifier.

## Heures d'ouverture

L'amont récent documente extraction automatique, plusieurs plages quotidiennes et fermetures depuis les Paramètres IA. Le sélecteur actuel Caléonis de cette page ne fournit pas ces contrôles. Les horaires existants de l'entreprise et les paramètres nécessaires à la réservation doivent être configurés par l'opérateur via les fonctions disponibles, puis vérifiés dans les disponibilités.

L'API `PATCH /business` documente les champs réellement pris en charge. Ne présentez pas l'extraction ou les nouveaux contrôles amont comme disponibles sans implémentation et qualification spécifiques. De même, le runtime Caléonis expose français/anglais ; les six langues de repli supplémentaires de l'amont récent ne sont pas annoncées comme une option de ce sélecteur.
''' if language == 'fr' else '''
## Business summary

The new candidate UI in this PR exposes the manual business summary already supported by the backend. Enter approved facts, save and verify a new call. This candidate interface does not mean the previously qualified production deployment has changed.

The latest upstream adds automatic generation from knowledge and an AI rewrite button. Neither automation is implemented in this candidate; no dummy rewrite control is shown. Keep Knowledge facts accurate and test the resulting answer.

## Opening hours

The latest upstream guide describes automatic extraction, multiple daily windows and closures in AI settings. The current Caléonis page does not expose those controls. Have the operator configure the business's existing hours and booking prerequisites through available functions, then verify availability.

PATCH /business documents the fields actually supported by this runtime. Do not present extraction or new upstream controls as available without specific implementation and qualification. The Caléonis selector exposes French and English; the latest upstream's six additional fallback languages are not a promised option here.
'''
    path.write_text(content + '\n\n{/* Latest upstream settings differences */}\n' + body, encoding='utf-8')

# Keep the source's concise sidebar labels even where an honest Caléonis page
# needs a different full title. Long replacement headings must not redesign nav.
for path in DOCS.rglob('*.mdx'):
    relative = path.relative_to(DOCS).as_posix()
    if 'node_modules/' in relative or 'api-reference/' in relative:
        continue
    english = relative.startswith('en/')
    native_path = PUBLIC_SOURCE / (relative[3:] if english else 'fr/' + relative)
    if not native_path.is_file():
        continue
    original = native_path.read_text(encoding='utf-8')
    sidebar = re.search(r'^sidebarTitle:\s*(.+)$', original, re.M)
    if sidebar:
        content = path.read_text(encoding='utf-8')
        if not re.search(r'^sidebarTitle:', content, re.M):
            content = content.replace('\n---\n', '\nsidebarTitle: ' + sidebar.group(1).replace('LobbyStack', 'Caléonis Receptionist') + '\n---\n', 1)
            path.write_text(content, encoding='utf-8')

# The former public GitHub repository now returns 404. Keep public source links
# on the verified official GitLab main tree rather than a private fork URL.
for path in DOCS.rglob('*.mdx'):
    if 'node_modules' in path.parts:
        continue
    content = path.read_text(encoding='utf-8')
    content = content.replace('https://github.com/lobbystack/lobbystack/blob/main/', 'https://gitlab.com/lobbystack-group/lobbystack/-/blob/main/')
    content = content.replace('https://github.com/lobbystack/lobbystack', 'https://gitlab.com/lobbystack-group/lobbystack')
    if 'self-hosting' in path.parts:
        content = content.replace('https://github.com/PajuanDev/caleonis-reception/blob/main/', 'https://gitlab.com/lobbystack-group/lobbystack/-/blob/main/')
        content = content.replace('git clone https://github.com/PajuanDev/caleonis-reception.git\ncd caleonis-reception', 'git clone https://gitlab.com/lobbystack-group/lobbystack.git\ncd lobbystack')
        if path.name == 'docker-compose.mdx' and 'The example below clones' not in content and "L'exemple ci-dessous clone" not in content:
            if 'en' in path.relative_to(DOCS).parts:
                content = content.replace('## Prerequisites\n', '## Prerequisites\n\nThe example below clones the public MIT base for an independent deployment. It does not clone Caléonis production or its private fixes/configuration. To reproduce a specific Caléonis candidate, use the authorized repository and audited commit with your own secrets and accounts.\n')
            else:
                content = content.replace('## Prérequis\n', "## Prérequis\n\nL'exemple ci-dessous clone le socle MIT public pour une installation indépendante. Il ne clone pas la production Caléonis ni ses correctifs/configurations privés. Pour reproduire un candidat Caléonis précis, utilisez le dépôt autorisé et son commit audité, avec vos propres secrets et comptes.\n")
    path.write_text(content, encoding='utf-8')
