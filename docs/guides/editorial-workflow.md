# Editorial Workflow Guide

## Overview

The editorial workflow is the process an article follows from initial creation through to publication on the LIMITLESS PATHS platform. It exists to ensure quality control — every piece of content is reviewed before it reaches platform users.

By separating writing, reviewing, and publishing into distinct stages, the workflow allows different team members to contribute at the right moment without giving everyone full control over what goes live.

---

## The 5 Statuses

Every article on the platform exists in exactly one of these five states at any given time.

### Draft
The article is being written. Only the author and admins can see it. This is the starting state for all new articles. The author can edit freely and take as long as needed before submitting.

### In Review
The author has finished writing and submitted the article for editorial review. Editors can now see and assess the article. The author cannot make further edits while the article is in this state — it is in the reviewer's hands.

### Approved
An editor or publisher has reviewed the article and confirmed it meets quality standards. The article is ready to go live but has not been published yet. A publisher or admin controls when it actually becomes visible to users.

### Published
The article is live and visible to all platform users. Only a publisher or admin can move an article to this status.

### Archived
The article has been removed from public view. Users can no longer find or read it. The article is preserved in the system for reference and can be reopened if needed.

---

## Flow Diagram

```
DRAFT ──→ IN_REVIEW ──→ APPROVED ──→ PUBLISHED ──→ ARCHIVED
  ↑            │              │                         │
  └────────────┘ (reject)     │                         │
  ↑                           │                         │
  └───────────────────────────┘ (revise)                │
  ↑                                                     │
  └─────────────────────────────────────────────────────┘ (reopen)
```

**Reading the diagram:**
- The main line (top row) is the standard forward path.
- **Reject** sends the article back to Draft so the author can address feedback.
- **Revise** sends an Approved article back to Draft if further edits are needed before publishing.
- **Reopen** sends an Archived article back to Draft to begin the cycle again.

---

## Who Can Do What

Permissions are attached to roles, not individuals. The table below shows what permission is required for each action and which roles typically carry that permission.

| Action | Required Permission | Who typically has it |
|---|---|---|
| Create article | `articles.create` | Coach, Editor, Publisher, Admin |
| Edit own draft | `articles.create` | Coach, Editor, Publisher, Admin |
| Edit any article | `articles.update` | Editor, Publisher, Admin |
| Submit for review | `articles.submit_review` | Coach, Editor, Publisher, Admin |
| Approve or reject | `articles.review` | Editor, Publisher, Admin |
| Publish, archive, or reopen | `articles.publish` | Publisher, Admin |
| Delete permanently | `articles.delete` | Admin |

See the [Role Setup Guide](./role-setup.md) for instructions on configuring roles and assigning permissions.

---

## Step-by-Step Workflows

### How to Submit an Article for Review

1. Open the article in the editor.
2. Confirm the article is complete — once submitted, the author cannot edit it until it is rejected or sent back for revision.
3. Click **Submit for Review** in the article sidebar or toolbar.
4. The article status changes from **Draft** to **In Review**.
5. Editors with the `articles.review` permission will see the article in their review queue.

**Tip:** Add a note in the article description or comments to give the reviewer context if needed.

---

### How to Approve or Reject an Article

1. Navigate to the **Review Queue** in the editorial dashboard.
2. Open the article you want to assess.
3. Read the article. Check for accuracy, quality, and alignment with the platform's content guidelines.
4. Choose one of the following:
   - **Approve** — click Approve. The article moves to **Approved** status. A publisher can now make it live.
   - **Reject** — click Reject. You will be prompted to add a note explaining what needs to change. The article returns to **Draft** and the author is notified. Your notes are attached to the article for the author to read.

**Best practice:** Always add a rejection note. A blank rejection leaves the author with no direction and slows down the process.

---

### How to Publish an Approved Article

1. Navigate to the content dashboard or the article directly.
2. Find articles with **Approved** status.
3. Open the article.
4. Click **Publish**.
5. The article status changes to **Published** and is immediately visible to platform users.

**Note:** Only users with the `articles.publish` permission can perform this step. If you do not see a Publish button, your role does not include this permission. Contact your administrator.

---

### What Happens When an Article is Rejected

When a reviewer rejects an article:

1. The article returns to **Draft** status.
2. The reviewer's notes are attached to the article.
3. The author is notified (depending on your platform notification settings).
4. The author can read the feedback, make edits, and resubmit for review by clicking **Submit for Review** again.

The rejection does not delete anything. The article and all its content are preserved.

---

### How to Send an Approved Article Back for Edits (Revise)

Sometimes an article reaches **Approved** status but a publisher or admin identifies a problem before publishing. Rather than publishing a flawed article, use the revise action to send it back for edits.

1. Open the Approved article.
2. Click **Request Revision** (or **Revise**, depending on your interface).
3. Add a note explaining what needs to change.
4. The article returns to **Draft** status.
5. The author can edit and resubmit through the normal review process.

This path is shown in the flow diagram as the **revise** arrow from Approved back to Draft.
