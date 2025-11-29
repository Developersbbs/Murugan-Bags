# Offer Popup Quick Start Guide

## Why the Popup Isn't Showing

The popup is not appearing on your homepage because **you haven't created any active popups yet**. The system is working correctly - it just needs content!

## How to Create Your First Popup

### Step 1: Access Admin Panel
1. Open your browser and go to: `http://localhost:3000`
2. Log in with your admin credentials

### Step 2: Navigate to Offer Popups
1. In the left sidebar, click on **"Home Page"** to expand it
2. Click on **"Offer Popups"**

### Step 3: Create a New Popup
1. Click the **"Add New Popup"** button (top right)
2. Fill in the form:

   **Image Upload** (Required)
   - Click the upload area
   - Select an attractive offer image (max 5MB)
   - Supported formats: JPG, PNG, GIF, WEBP
   - Recommended size: 1200x800px or similar

   **Heading** (Required)
   - Example: "🎉 Summer Sale - 50% Off!"
   - Keep it short and catchy

   **Description** (Required)
   - Example: "Get amazing discounts on all bags this summer. Limited time offer!"
   - Be clear about the offer

   **Button Text** (Optional)
   - Default: "Shop Now"
   - You can customize: "Grab Deal", "Shop Sale", etc.

   **Button Link** (Optional)
   - Default: "/products"
   - Can link to specific category: "/products?category=backpacks"

   **Priority** (Optional)
   - Default: 0
   - Higher number = shows first (if multiple popups)

   **Start/End Date** (Optional)
   - Leave empty for always active
   - Set dates for time-limited offers

   **Active Checkbox**
   - ✅ Make sure this is CHECKED to show the popup!

3. Click **"Save Popup"**

### Step 4: Test on Homepage
1. Open your frontend: `http://localhost:3000` (or the correct frontend URL)
2. **Important**: Clear your browser's session storage:
   - Press F12 to open Developer Tools
   - Go to "Application" tab
   - Click "Session Storage" in left sidebar
   - Right-click and select "Clear"
3. Refresh the page (F5)
4. The popup should appear after 1 second! 🎉

## Troubleshooting

### Popup Still Not Showing?

**Check 1: Is the popup active?**
- Go to admin panel → Offer Popups
- Make sure the toggle shows "Active" (green)
- If not, click the toggle to activate it

**Check 2: Clear session storage**
- The popup only shows once per browser session
- Clear session storage as shown above
- Or use Incognito/Private browsing mode

**Check 3: Check browser console**
- Press F12 → Console tab
- Look for any error messages
- Should see API call to `/api/offer-popups`

**Check 4: Verify API is working**
- Open: `http://localhost:5000/api/offer-popups`
- Should return JSON with your popup data
- If `"data": null`, no active popups exist

**Check 5: Check date range**
- If you set start/end dates, make sure current date is within range
- Or remove the dates to make it always active

## How the Popup Works

1. **Session-Based Display**
   - Popup shows only ONCE per browser session
   - After closing, it won't show again until:
     - User closes browser and reopens
     - Session storage is cleared
     - User uses incognito mode

2. **Priority System**
   - If multiple active popups exist, highest priority shows
   - Priority 10 shows before Priority 5
   - Same priority? Most recently created shows

3. **Date Scheduling**
   - Set start date: Popup shows from that date forward
   - Set end date: Popup stops showing after that date
   - Both empty: Always active (recommended for testing)

## Managing Popups

### Edit a Popup
1. Go to Offer Popups page
2. Click the **Edit** button on any popup card
3. Make changes
4. Click "Save Popup"

### Toggle Active/Inactive
- Click the toggle switch on any popup card
- Green = Active (will show on homepage)
- Gray = Inactive (won't show)

### Delete a Popup
1. Click the **Delete** button on any popup card
2. Confirm deletion
3. Image file is automatically deleted from server

## Tips for Great Popups

✅ **Do:**
- Use high-quality, eye-catching images
- Keep heading short and punchy
- Make the offer clear in description
- Test on mobile devices too
- Use time-limited offers to create urgency

❌ **Don't:**
- Use images larger than 5MB
- Write long paragraphs in description
- Create too many active popups at once
- Forget to set end dates for limited offers

## Example Popup Ideas

1. **Welcome Offer**
   - Heading: "Welcome! Get 10% Off Your First Order"
   - Button: "Claim Discount"
   - Link: "/products?discount=WELCOME10"

2. **Flash Sale**
   - Heading: "⚡ Flash Sale - 24 Hours Only!"
   - Button: "Shop Now"
   - Set end date: Tomorrow

3. **New Arrivals**
   - Heading: "Check Out Our Latest Collection"
   - Button: "Explore New Arrivals"
   - Link: "/products?sort=newest"

4. **Free Shipping**
   - Heading: "Free Shipping on Orders Above ₹999"
   - Button: "Start Shopping"

## Need Help?

If you're still having issues:
1. Check that all three servers are running:
   - Backend: `http://localhost:5000`
   - Admin: `http://localhost:3000`
   - Frontend: Check your frontend URL
2. Check browser console for errors
3. Verify the popup is marked as "Active" in admin panel
4. Clear session storage and try again

---

**Quick Test Checklist:**
- [ ] Created a popup in admin panel
- [ ] Uploaded an image
- [ ] Filled in heading and description
- [ ] Checked "Active" checkbox
- [ ] Saved the popup
- [ ] Cleared session storage
- [ ] Refreshed homepage
- [ ] Popup appeared! 🎉
