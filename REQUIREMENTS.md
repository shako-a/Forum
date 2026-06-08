# Forum — Requirements

> Source: `forum tech.pdf`. Core interface modeled loosely on Reddit, with fewer functions and no on-platform apps.

## Platforms
- **Website** — now
- **iOS & Android** — later (implies an API-first backend so mobile clients can reuse it)

## Core Variables
- **Post**
- **Topic / Category**
- **Reply**

## Cross-cutting requirements (called out by the owner)
- **Admin panel** — required. Admins manage advertisement cards, categories, users, moderators, and removed content.
- **Internationalization (i18n)** — the finished product must be translatable to a second language (Georgian text appears throughout the spec). All user-facing strings must be externalized from day one.
- **Future:** Stripe Connect integration so users can buy/sell on the marketplace, with a small commission to the forum.

---

## Home Page
1. **Header**
   - Logo
   - Search bar / Ask AI
   - Registration / Log-in
     - (website only) app download button
2. **Left sidebar**
   - 2.1 Buttons: Home, Popular, News, Categories
   - 2.2 Resources
   - 2.3 Suggested Topics
   - 2.4 Footer
3. **Top panel — cards**
   - Popular topics
   - Advertisement cards (reserved for forum admins to manage from the admin panel)
4. **Right sidebar** — topics and recommendations
5. **Feed**

## Post Creation
- Only registered, logged-in users can create a post.
- Entry points: feed (top-right "Create" button) or from inside a category.
- Flow:
  1. Choose the category
  2. Title of the post
  3. Body — **rich text editor** (media, links, bullet points, numbered lists, quotes)

## Post Page
1. Post replies
2. Share — Facebook / Instagram, copy link
3. Type the reply — text / image
4. Replies / comments
   - 4.1 Reply rating (+ / −)
   - 4.2 Reply to a specific comment (starts a nested thread)
   - 4.3 Share a reply — Facebook / Instagram, copy link
- Replies/comments support nested threading.

## Categories
- Page displays posts broken into categories, showing the 3 most recently discussed posts per category.
  - Category name
  - Name of the post
  - "… see all" link
- **Categories to create:**
  | Category | Locked? |
  |---|---|
  | Discussions | No |
  | Employment | Yes (posts/details only for registered + logged-in users) |
  | Housing | Yes |
  | Automobile & Carriers | Yes |
  | Legal | Yes |
  | Marketplace | Yes |
  | Assistance and Charity | No |
  | Services | Yes |
  | Networking | Yes |
- **Locked category:** name is visible to guests, but content is gated behind registration/login.

## User Profile Types (roles)
- **Guest** (non-registered)
  - View general categories
  - See names of locked categories but cannot access them
  - Cannot post/reply, cannot share
- **User** (registered)
  - Can post and reply
  - Can access locked categories
  - Cannot delete or edit others' posts
  - Sees only public info on other users' profiles
- **Moderator**
  - Can edit and **hide** (not delete) users' posts and replies
  - Can lock replies on a post
  - Hidden/edited content is **not** removed from the server — only hidden from public/User access; admins can still see it
- **Administrator**
  - Unlimited access to categories, user and moderator profiles (including restricting topics/users)
  - Sees content removed/hidden/deleted by moderators or other admins
  - Can move profiles to archive

## User Profile Fields
- First & Last name — **mandatory** (user may optionally hide or show it)
- Name on the forum — **required**
- Phone number — **required**, hidden from other users
- Email — **required**, hidden
- City
- State — **required**

## Moderator Profile
- Same fields as user profile, plus assigned category/categories (can be more than one)

## Future Steps
- Connect to **Stripe Connect** for marketplace buy/sell, with a small commission to the forum.
