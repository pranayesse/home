# When Support Asks "What Device Are You On?" — That's Not Identity Verification

There's a category of account recovery flow that looks secure on the surface — lots of questions, specific details, a whole back-and-forth with a support agent — but is actually collecting the wrong things entirely.

Spotify's support process is a good case study. The details have likely changed, but the design flaw it illustrates is very much alive elsewhere.

---

## How It Worked

Spotify's account recovery, when handled through support chat, used to involve verifying a few things before agreeing to update account credentials:

- Device name (what device you used to log in)
- General location (city, country)
- Sometimes the account's email address history or subscription details

The idea was to confirm you're the real owner by asking for details only you'd know. It's the right instinct — "prove you know things about this account" — but the implementation had a gap: **those details are observable, not secret.**

Device name and location aren't things only the account owner knows. They're things anyone who has *access to your device* for 30 seconds, or anyone you've recently been in contact with, might be able to see. In some cases, they're things you'd share without thinking — mentioning you're in Bangalore, or that you use a MacBook Pro.

But there's a more systematic way to collect them.

---

## Canary Tokens: Recon Without Asking

A canary token is a URL that, when clicked, silently reports back the clicker's IP address, browser, operating system, and device information — without displaying any sign that this has happened.

They were designed for defensive use: drop a fake sensitive file, embed a canary link, get alerted if an attacker opens it. The moment it fires, you know something accessed a resource it shouldn't have.

But the same mechanism works in reverse. If you can get someone to click a canary URL — sent as a "check out this playlist," a "you need to verify your account," a short link that redirects to something legitimate — you'll receive a packet of metadata about their device that's accurate, specific, and current.

That metadata is exactly what a support agent asking for "your device details" is looking for.

---

## The Trust Escalation

Here's the part that makes this a design problem rather than just a phishing problem:

Even if Spotify's support team was correctly verifying device details, the *end state* of a successful verification was that they'd update the account's email address to whatever the caller provided.

Think about that flow:
1. Caller provides details about the account → support confirms ownership → support updates recovery email to a new address

That last step is the critical one. The whole verification process exists to protect the account. But if it ends with "we'll send future access to whatever email you give us now," then the verification has protected nothing. You've just transferred the account.

This is sometimes called a trust escalation problem: you earn trust at one level (by knowing device metadata), then use that trust to make a change at a higher level (taking over the account's recovery path). The verification step and the change it permits aren't commensurate.

---

## Why "Things You Know About the Account" Isn't Enough

The security model behind knowledge-based authentication is: *the real owner knows things an attacker doesn't*. That holds when the knowledge is genuinely secret — a password, a randomly generated backup code, a PIN set at enrolment.

It breaks down when the knowledge is observable. And "observable" is a bigger category than most people think:

- **Device name and OS**: visible to anyone who picks up your phone, uses your laptop, or receives a file from you with metadata intact
- **Location**: obvious from context in most cases
- **Last login time**: guessable from usage patterns
- **Subscription type / payment method last four digits**: sometimes visible on shared accounts or mentioned in passing

The attacker doesn't need to guess these. They just need a way to observe them. A link, a file, a WhatsApp message that previews — any of these can serve as the collection point.

---

## What Better Account Recovery Looks Like

The gap isn't that support agents ask questions. It's that the questions are answerable by someone other than the account owner.

Better approaches:
- **Verify through the existing registered email or phone** — if you have access to those, you're probably the owner; if you don't, that's relevant information
- **Time-delay account takeovers** — send a notification to the old email saying "your account email will be changed in 48 hours unless you cancel this request"
- **Treat email updates as high-trust actions** — require two-factor confirmation for any change to recovery credentials, not just a chat conversation
- **Separate verification from change** — the fact that someone knows your device name shouldn't immediately entitle them to change your recovery email; those should be independent trust levels

The 48-hour delay approach is particularly effective. It doesn't stop the attack immediately, but it gives the real account owner a window to notice and intervene — converting a silent takeover into a recoverable incident.

---

## The Bigger Point

Support channels are an attack surface. They're often the *softest* attack surface on a platform, because they're staffed by humans trying to be helpful, optimised for resolution speed, and dealing with users who are already locked out and frustrated.

Any time a platform allows support to make changes to account credentials, there's a question worth asking: *what does the verification actually prove, and is that sufficient for the change being made?*

If the answer is "we ask about their device and location," the next question is: *could someone other than the account owner know those things?*

More often than not, the answer is yes.
