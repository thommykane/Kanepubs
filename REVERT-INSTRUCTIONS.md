# Revert to a stable state and redeploy on Vercel

Your current **deployed** state (commit `4e12d25`) already has a **reduced sidebar** (no My Clients, My Businesses, My Organizations, Administrative). The only uncommitted change is the Sidebar edit from the last session.

To go back to a **previous stable state** where the full sidebar and features were present:

---

## Option 1: Full reset to commit d7b51e1 (recommended)

This puts the whole project back to: **"Add My Account, Administrative, role-based sidebar, and client/lead features"**. You will lose all commits after that (CVB uploader, delete button changes, etc.). Vercel will redeploy that version.

**Run these in PowerShell from the Kane Pubs folder:**

```powershell
cd "c:\Users\Thommy Kane\OneDrive\Desktop\Kane Pubs"

# 1. Discard any uncommitted changes
git restore .

# 2. Hard reset to the stable commit (d7b51e1)
git reset --hard d7b51e1

# 3. Force push so Vercel redeploys from this state
git push --force origin main
```

After the force push, Vercel will automatically build and deploy from `d7b51e1`. Your site will show the full sidebar again (My Organizations, My Businesses, My Contacts, My Clients, All Clients under Administrative, and the activity links).

---

## Option 2: Only restore the Sidebar from d7b51e1 (keep other commits)

If you want to keep your recent commits (e.g. delete button removal) and only bring back the sidebar with My/Admin links:

```powershell
cd "c:\Users\Thommy Kane\OneDrive\Desktop\Kane Pubs"

# Restore Sidebar from the old commit
git checkout d7b51e1 -- components/Sidebar.tsx

# Commit and push
git add components/Sidebar.tsx
git commit -m "Restore full sidebar (My Account, Administrative) from d7b51e1"
git push origin main
```

Vercel will redeploy with the restored sidebar. Other files stay at the current commit.

---

## If something goes wrong

- To undo a **local** reset before you push:  
  `git reflog`  
  then  
  `git reset --hard 4e12d25`  
  (or whatever commit hash you see that you want to return to).

- After a **force push**, the old commits are still on your machine until you run something like `git gc`. So you can create a new branch from an old hash if you need to recover code later.

Delete this file (REVERT-INSTRUCTIONS.md) when you're done if you don't want to keep it in the repo.
