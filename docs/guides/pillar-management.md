# Pillar Management Guide

## What Are Pillars?

Pillars are the top-level categories used to organise all content on the LIMITLESS PATHS platform. Every article and course belongs to one pillar. Pillars give users a clear way to browse and filter content by the health or wellness domain they care about most.

Think of pillars as the primary shelf labels in a library. They do not describe individual articles in detail — they group content into broad, meaningful domains so users can find what they are looking for quickly.

---

## Default Pillars

The following six pillars come pre-installed on every new LIMITLESS PATHS instance:

| # | Pillar |
|---|---|
| 1 | Nutrition |
| 2 | Movement |
| 3 | Sleep |
| 4 | Mental Health |
| 5 | Medicine |
| 6 | Health Tech |

These defaults cover the core domains of longevity medicine. You can edit their names and descriptions, reorder them, add new ones, or deactivate any that are not relevant to your platform.

---

## Managing Pillars

### Adding a New Pillar

1. Go to the admin panel at `admin.your-domain.com` and sign in.
2. In the left sidebar, navigate to **Content > Pillars**.
3. Click **+ New Pillar**.
4. Fill in the following fields:
   - **Name** — the display name shown to users (e.g., "Longevity Science").
   - **Slug** — auto-generated from the name. You can edit it if needed. The slug is used in URLs, so keep it lowercase with hyphens and no spaces (e.g., `longevity-science`). Once content is published under a pillar, avoid changing the slug as it will break existing links.
   - **Description** — a short sentence explaining what this pillar covers. Shown on the pillar browse page.
   - **Icon** — select or upload an icon to represent the pillar visually.
   - **Display Order** — a number that controls where this pillar appears relative to others. Lower numbers appear first.
5. Click **Save**.

The new pillar is immediately available when assigning articles or courses.

---

### Editing a Pillar

1. Navigate to **Content > Pillars** in the admin panel.
2. Find the pillar you want to change and click **Edit**.
3. Update any fields — name, description, icon, or display order.
4. Click **Save**.

Changes to the name and description appear immediately on the public-facing platform. As noted above, avoid changing the slug if content is already published under that pillar.

---

### Reordering Pillars

The display order of pillars is controlled by the **Display Order** field on each pillar.

- Pillars are shown in ascending numeric order (1 appears before 2, and so on).
- To move a pillar earlier in the list, lower its display order number.
- To move a pillar later in the list, raise its display order number.
- Numbers do not need to be consecutive. You can use 10, 20, 30 to leave room for future insertions.

To reorder:
1. Navigate to **Content > Pillars**.
2. Click **Edit** on the pillar you want to move.
3. Change the **Display Order** number.
4. Save.

Repeat for any other pillars whose relative order needs to change.

---

### Deactivating a Pillar

Deactivating a pillar hides it from the public browse view. Users will no longer see the pillar as a category, and content tagged with it will not appear in pillar-filtered searches.

Deactivation does **not** delete anything. All articles and courses tagged with a deactivated pillar are preserved exactly as they are. Reactivating the pillar restores full visibility immediately.

To deactivate:
1. Navigate to **Content > Pillars**.
2. Find the pillar and click **Edit**.
3. Toggle the **Active** switch to off.
4. Save.

To reactivate, follow the same steps and toggle Active back on.

**Use deactivation instead of deletion** whenever you are unsure whether you will need the pillar again, or when any content is already tagged with it.

---

### Deleting a Pillar

Deletion is permanent and cannot be undone.

A pillar can only be deleted if **no articles or courses are currently tagged with it**. If any content is linked to the pillar, the delete action will be blocked and you will see an error.

To delete a pillar:
1. Reassign or delete any content tagged with it, or deactivate the pillar instead.
2. Once the pillar has no linked content, navigate to **Content > Pillars**.
3. Click the **...** menu next to the pillar and select **Delete**.
4. Confirm the deletion.

If you are unsure, deactivate instead of delete. Deactivation is reversible; deletion is not.

---

## How Pillars Work with Content

### Articles
Each article belongs to exactly one pillar. Pillar assignment is made in the article editor sidebar, in the **Pillar** field. An article cannot be published without a pillar assigned.

### Courses
Each course can also be assigned to one pillar. This is done in the course settings panel. Pillar assignment is optional for courses but recommended to ensure they appear in browse and filter results.

### User-Facing Browse
On the public platform, users can browse all content filtered by pillar. The pillar browse page shows the pillar name, description, and all published articles and courses tagged with it.

### Filtering and Search
Users can filter search results by pillar. Pillar is one of the primary filters available in the content discovery interface.

---

## Permissions Required

Managing pillars requires the following permissions:

| Action | Permission needed |
|---|---|
| Create a new pillar | `pillars.create` |
| Edit, reorder, or deactivate a pillar | `pillars.update` |
| Delete a pillar | `pillars.delete` |

See the [Role Setup Guide](./role-setup.md) for instructions on assigning these permissions to roles.
