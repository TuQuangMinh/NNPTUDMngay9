var express = require("express");
var router = express.Router();
let mongoose = require("mongoose");
const messageModel = require("../schemas/messages");
const { checkLogin } = require("../utils/authHandler");
const { uploadFile } = require("../utils/uploadHandler");

// GET / - Lấy message cuối cùng của mỗi user mà user hiện tại đã chat
router.get("/", checkLogin, async function (req, res, next) {
    try {
        let currentUserId = req.user._id;

        let messages = await messageModel.aggregate([
            {
                $match: {
                    $or: [
                        { from: currentUserId },
                        { to: currentUserId }
                    ]
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: {
                        $cond: {
                            if: { $eq: ["$from", currentUserId] },
                            then: "$to",
                            else: "$from"
                        }
                    },
                    latestMessage: { $first: "$$ROOT" }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $unwind: {
                    path: "$user",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    user: { _id: 1, username: 1, email: 1, avatarUrl: 1, fullName: 1 },
                    latestMessage: 1
                }
            },
            {
                $sort: { "latestMessage.createdAt": -1 }
            }
        ]);

        res.send(messages);
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: error.message });
    }
});

// GET /:userID - Lấy toàn bộ message từ user hiện tại đến userID và ngược lại
router.get("/:userID", checkLogin, async function (req, res, next) {
    try {
        let currentUserId = req.user._id;
        let otherUserId = req.params.userID;
        
        let parseOtherId = new mongoose.Types.ObjectId(otherUserId);

        let messages = await messageModel.find({
            $or: [
                { from: currentUserId, to: parseOtherId },
                { from: parseOtherId, to: currentUserId }
            ]
        })
        .sort({ createdAt: 1 })
        .populate('from', 'username avatarUrl email')
        .populate('to', 'username avatarUrl email');

        res.send(messages);
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: error.message });
    }
});

// POST / - Gửi message (text hoặc file)
router.post("/", checkLogin, uploadFile.single("file"), async function (req, res, next) {
    try {
        let currentUserId = req.user._id;
        let toUser = req.body.to;

        if (!toUser) {
            return res.status(400).send({ message: "Thiếu thông tin người nhận (to: userID)" });
        }

        let messageType = "text";
        let messageText = req.body.text; // Text content if type is text

        if (req.file) {
            messageType = "file";
            messageText = req.file.path.replace(/\\/g, '/'); // Convert backslashes for path
        } else if (req.body.type === "text" || req.body.text) {
            messageType = "text";
        } else if (req.body.type === "file" && req.body.text) {
            // Trường hợp user cố tình không upload file bằng form-data file thật
            // mà parse từ postman dạng body form-data hoặc JSON tay
            messageType = "file";
        }

        if (!messageText) {
            return res.status(400).send({ message: "Nội dung không được để trống" });
        }

        let newMessage = new messageModel({
            from: currentUserId,
            to: toUser,
            messageContent: {
                type: messageType,
                text: messageText
            }
        });

        await newMessage.save();

        await newMessage.populate('from', 'username avatarUrl fullName email');
        await newMessage.populate('to', 'username avatarUrl fullName email');

        res.send(newMessage);
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: error.message });
    }
});

module.exports = router;
