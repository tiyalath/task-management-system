import express from 'express';
import User from '../models/User.js';
import {auth} from '../middleware/auth.js';

const router=express.Router();
router.use(auth);

router.get('/',async(req,res)=>{
  const users=await User.find().select('name email role createdAt').sort({name:1});
  res.json(users);
});

export default router;
