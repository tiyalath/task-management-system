import express from 'express'; import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken'; import User from '../models/User.js'; import {auth} from '../middleware/auth.js';
const router=express.Router();
const sign=u=>jwt.sign({sub:u._id.toString(),role:u.role},process.env.JWT_SECRET,{expiresIn:'7d'});
router.post('/register',async(req,res)=>{try{const{name,email,password}=req.body;if(!name||!email||!password||password.length<8)return res.status(400).json({message:'Name, email and password (8+ chars) required'});if(await User.findOne({email:email.toLowerCase()}))return res.status(409).json({message:'Email already registered'});const user=await User.create({name,email,passwordHash:await bcrypt.hash(password,12)});res.status(201).json({token:sign(user),user:{id:user.id,name:user.name,email:user.email,role:user.role}});}catch(e){res.status(500).json({message:'Registration failed'});}});
router.post('/login',async(req,res)=>{const{email,password}=req.body;const user=await User.findOne({email:(email||'').toLowerCase()});if(!user||!await bcrypt.compare(password||'',user.passwordHash))return res.status(401).json({message:'Invalid email or password'});res.json({token:sign(user),user:{id:user.id,name:user.name,email:user.email,role:user.role}});});
router.get('/me',auth,(req,res)=>res.json(req.user));
export default router;
