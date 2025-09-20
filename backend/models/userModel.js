// backend/models/userModel.js
import { db } from "./db.js";

export const createUser = (user) =>
  db("users").insert(user).returning("*");

export const findUserByEmail = (email) =>
  db("users").where({ email }).first();

