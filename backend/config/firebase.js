// DEPRECATED: This file is deprecated.
// All Firebase imports should use ../lib/firebase.js instead, which has proper initialization checks.
// This prevents "Firebase app already exists" errors from double initialization.

const admin = require("../lib/firebase");

const bucket = admin.storage().bucket();

module.exports = { admin, bucket };