const express = require("express");
const router = express.Router();
const {
  addSubscriber,
  getAllSubscribers,
  deleteSubscriber,
} = require("../controller/subscriberControler");

router.post("/add", addSubscriber);
router.get("/getall", getAllSubscribers);
router.delete("/delete/:id", deleteSubscriber);

module.exports = router;
