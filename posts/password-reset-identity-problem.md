# Password Resets Are Broken — And It's Not the User's Fault

Most IT helpdesks have a quiet assumption baked into their password reset flow: if someone knows the right email address, they're probably the right person.

That assumption is doing a lot of heavy lifting. And it doesn't hold.

---

## The Setup

Here's how a typical university helpdesk reset used to work — and still works at plenty of organisations today:

1. User calls in and says they've forgotten their password
2. Helpdesk asks for a recovery email to send the reset link to
3. User provides an email address
4. Helpdesk sends the reset link there
5. Done

Notice what's missing? Any actual proof that the caller is who they say they are.

The email address isn't a secret. It's not something only the real account owner could know. At a university, student email formats are completely predictable — `firstname.lastname@university.edu`, or some variation of it. First name and last name are both public. Department, year of enrolment — also often findable.

And the recovery email? That's even easier. Any Gmail address that looks plausible is enough. Nobody is checking domain ownership. Nobody is confirming that the provided address has ever been associated with the account before.

---

## Why This Happens

Support staff are optimising for a different thing than security. Their goal is to resolve tickets quickly, keep users unblocked, and not make anyone's day harder than it needs to be. A student locked out of their account right before an exam is a genuine problem that needs a fast solution.

The email-as-identity check feels reasonable in that moment. It's a speed bump — enough friction to deter *complete* laziness, not enough to stop anyone who's thought about it for five minutes.

This isn't incompetence. It's a process designed around the average case (genuine user, minor inconvenience) that quietly ignores the edge case (someone who shouldn't be getting access at all).

---

## The Real Vulnerability: Email Is Not Identity

Email is a channel. Owning an email address proves you can receive messages at that address. It says absolutely nothing about who you are, or whether you have any legitimate claim to the account you're trying to reset.

Creating an email address that looks like it belongs to someone else takes about 45 seconds. Most providers won't stop you. There's no verification that the name in your email matches a real person, or that the person it resembles has consented to you using it.

When a helpdesk treats "user provided an email address" as equivalent to "user is authenticated," they've outsourced identity verification to Gmail's sign-up form. That's not a great place to put your trust.

---

## What Proper Verification Looks Like

The fix isn't to make the reset process slower and more annoying for everyone. It's to verify something only the real account owner could know or have.

**Better approaches:**
- Require the student ID number (not listed in any email signature)
- Ask a security question set during enrolment, not something guessable from a LinkedIn profile
- Verify through a second channel that was registered *before* the request — a phone number on file, not one provided during the call
- For high-risk resets, require the person to appear in person with an ID card

The principle: the verification step should be something an attacker *can't easily obtain*, not just something the legitimate user *happens to know*.

---

## The Broader Pattern

This same failure shows up everywhere password resets exist:

- Customer support lines that reset accounts on name + date of birth (both public)
- "Forgot password" flows that send resets to an email address the user types in *during* the reset — same session, no prior verification
- SMS-based resets that get routed to a SIM the attacker has already ported

The pattern is always the same: a process that feels like verification but is really just collecting information. And information, unlike a physical key, can be given to anyone.

---

## TL;DR

If your password reset flow can be completed by someone who knows a person's name and can create an email address, it's not really a password reset. It's an account transfer with extra steps.

The next time you're reviewing a support workflow, ask: *what does this check actually prove?* If the answer is "that they know publicly available information," that's your gap.
