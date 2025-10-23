db.users.insertOne({
  email: "admin@admin.com",
  password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.G",
  role: "admin",
  isEmailVerified: true,
  registrationStatus: "confirmed",
  paymentStatus: "completed",
  createdAt: new Date(),
  updatedAt: new Date()
});
