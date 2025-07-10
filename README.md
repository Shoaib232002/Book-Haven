# BookHaven - Online Bookstore

BookHaven is a modern, responsive online bookstore web application built with Node.js, Express, MongoDB, and vanilla JavaScript. It features user authentication, admin book management, a shopping cart, and a contact form.

## Features

- User registration and login (with password reset via OTP)
- Browse books by category and search
- Shopping cart with quantity management
- Admin dashboard for CRUD operations on books
- Responsive design with modern UI
- Contact form (sends email to admin)
- Session-based authentication

## Technologies Used

- Node.js & Express
- MongoDB & Mongoose
- HTML5, CSS3 (Grid, Flexbox, Glassmorphism)
- Vanilla JavaScript
- Nodemailer (for emails)
- bcrypt (for password hashing)
- express-session (for authentication)

## Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/Shoaib232002/Book-Haven.git
   cd Book-Haven
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Set up environment variables:**
   - Create a `.env` file if you want to override any defaults (optional).

4. **Start MongoDB:**
   - Make sure MongoDB is running locally on `mongodb://127.0.0.1:27017/myapp`.

5. **Start the server:**
   ```sh
   node server.js
   ```
   The app will run at [http://localhost:3000](http://localhost:3000).

## Default Admin Credentials

- **Email:** AdminBookStores@gmail.com
- **Password:** Admin@789

## File Structure

- `server.js` - Main Express server and API logic
- `Public/` - Static frontend files
  - `landing.html`, `login.html`, `register.html`, `admin-dashboard.html`, etc.
  - `styles/` - CSS files

## Usage

- Visit `/register` to create a user account.
- Login at `/login`.
- Browse and search books on `/landing` (after login).
- Use the cart to add/remove books.
- Admins can log in at `/admin-login` and manage books at `/admin-dashboard.html`.
- Use the contact form to send messages to the admin.

## License

MIT License

---

*Built with ❤️ for book lovers!*
