var express = require("express");
var router = express.Router();
let path = require("path");
let excelJs = require("exceljs");
let crypto = require("crypto");
let { validatedResult, CreateUserValidator, ModifyUserValidator } = require("../utils/validator")
let userModel = require("../schemas/users");
let roleModel = require("../schemas/roles");
let userController = require("../controllers/users");
const { checkLogin, checkRole } = require("../utils/authHandler");
let { uploadExcel } = require('../utils/uploadHandler');
let { sendUserPassword } = require('../utils/mailHandler');

function generateRandomPassword() {
  let pwd = crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  return pwd.slice(0, 16);
}

router.get("/", checkLogin, checkRole("ADMIN", "MODERATOR"), async function (req, res, next) {
  let users = await userModel
    .find({ isDeleted: false })
  res.send(users);
});
router.post('/import', checkLogin, checkRole('ADMIN', 'MODERATOR'), uploadExcel.single('file'), async function (req, res, next) {
  try {
    if (!req.file) return res.status(400).send({ message: 'Cần upload file Excel' });

    let workbook = new excelJs.Workbook();
    let filePath = path.join(__dirname, '../uploads', req.file.filename);
    await workbook.xlsx.readFile(filePath);
    let worksheet = workbook.worksheets[0];

    let roleUser = await roleModel.findOne({ name: /user/i, isDeleted: false });
    if (!roleUser) return res.status(400).send({ message: 'Role user không tồn tại' });

    let results = [];

    for (let index = 2; index <= worksheet.rowCount; index++) {
      let rowError = [];
      let row = worksheet.getRow(index);

      let usernameCell = row.getCell(1);
      let emailCell = row.getCell(2);
      let username = (usernameCell && (usernameCell.text || usernameCell.value)) ? String(usernameCell.text || usernameCell.value).trim() : '';
      let emailRaw = (emailCell && (emailCell.text || emailCell.value)) ? String(emailCell.text || emailCell.value).trim() : '';
      let email = emailRaw.toLowerCase();

      console.log(`import row ${index}: username='${username}', emailRaw='${emailRaw}', email='${email}'`);

      if (!username) rowError.push('username khong duoc de trong');
      if (!email) rowError.push('email khong duoc de trong');
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        // Nếu email đúng cấu trúc cơ bản mà regex chưa nhận, bạn có thể mở rộng tại đây
        rowError.push('email khong hop le');
      }

      let existedUser = await userModel.findOne({ $or: [{ username: username }, { email: email }], isDeleted: false });
      if (existedUser) rowError.push('username hoac email da ton tai');

      if (rowError.length > 0) {
        results.push({ row: index, success: false, errors: rowError });
        continue;
      }

      let password = generateRandomPassword();
      let newUser = await userController.CreateAnUser(username, password, email, roleUser._id);

      try {
        await sendUserPassword(email, password);
      } catch (emailErr) {
        console.error('Loi gui mail:', emailErr);
      }

      results.push({ row: index, success: true, user: { id: newUser._id, username, email } });
    }

    res.send(results);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: error.message });
  }
});
router.get("/:id", async function (req, res, next) {
  try {
    let result = await userModel
      .find({ _id: req.params.id, isDeleted: false })
    if (result.length > 0) {
      res.send(result);
    }
    else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post("/", CreateUserValidator, validatedResult, async function (req, res, next) {
  try {
    let newUser = await userController.CreateAnUser(
      req.body.username, req.body.password, req.body.email,
      req.body.role, req.body.fullname, req.body.avatarUrl
    )
    res.send(newUser);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.put("/:id", ModifyUserValidator, validatedResult, async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedItem) return res.status(404).send({ message: "id not found" });

    let populated = await userModel
      .findById(updatedItem._id)
    res.send(populated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.delete("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }
    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;