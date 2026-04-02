const mongoose = require('mongoose');
const roleModel = require('./schemas/roles');
const userModel = require('./schemas/users');

// Dùng cùng tên DB với app.js
mongoose.connect('mongodb://localhost:27017/NNPTUD-C5')
  .then(async () => {
    console.log('Connected to DB');

    // Tạo role USER nếu chưa có
    let role = await roleModel.findOne({ name: 'USER' });
    if (!role) {
      role = await roleModel.create({ name: 'USER', description: 'User' });
    }
    console.log('Role USER ID:', role._id.toString());

    // Tạo userA
    let u1 = await userModel.findOne({ username: 'userA' });
    if (!u1) {
      u1 = new userModel({ username: 'userA', password: '123456', email: 'userA@test.com', role: role._id });
      await u1.save();
      console.log('Created userA ID:', u1._id.toString());
    } else {
      console.log('userA ID:', u1._id.toString());
    }

    // Tạo userB
    let u2 = await userModel.findOne({ username: 'userB' });
    if (!u2) {
      u2 = new userModel({ username: 'userB', password: '123456', email: 'userB@test.com', role: role._id });
      await u2.save();
      console.log('Created userB ID:', u2._id.toString());
    } else {
      console.log('userB ID:', u2._id.toString());
    }

    console.log('\n=== XONG! Copy ID o tren de test Postman ===');
    process.exit(0);
  })
  .catch(err => {
    console.error('Loi:', err.message);
    process.exit(1);
  });
