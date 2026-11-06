require("dotenv").config();

const mongoose = require("mongoose");
const readline = require("readline");
const User = require("../models/User");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({
      email: "staff@example.com",
      role: "staff",
    });

    if (!user) {
      console.log("Staff account not found.");
      return;
    }

    rl.question("Enter new staff password: ", async (password) => {
      try {
        if (password.length < 8) {
          console.log("Password must contain at least 8 characters.");
          return;
        }

        user.password = password;
        await user.save();

        console.log("Staff password updated successfully.");
      } catch (error) {
        console.error("Password reset failed:", error.message);
      } finally {
        await mongoose.disconnect();
        rl.close();
      }
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    await mongoose.disconnect();
    rl.close();
  }
}

resetPassword();