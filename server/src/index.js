import 'dotenv/config';import express from 'express';import cors from 'cors';import mongoose from 'mongoose';import bcrypt from 'bcryptjs';import User from './models/User.js';import authRoutes from './routes/auth.js';import projectRoutes from './routes/projects.js';import taskRoutes from './routes/tasks.js';import userRoutes from './routes/users.js';
if(!process.env.JWT_SECRET){console.error('JWT_SECRET is required');process.exit(1)}
const app=express();app.disable('x-powered-by');app.use(cors({origin:(process.env.CLIENT_ORIGIN||'http://localhost:5174').split(',')}));app.use(express.json({limit:'1mb'}));
app.get('/api/health',(req,res)=>res.json({status:'ok'}));app.use('/api/auth',authRoutes);app.use('/api/projects',projectRoutes);app.use('/api/tasks',taskRoutes);app.use('/api/users',userRoutes);app.use((req,res)=>res.status(404).json({message:'Route not found'}));
const port=process.env.PORT||5000;const uri=process.env.MONGO_URI||'mongodb://127.0.0.1:27017/taskflow';
async function seed(){const email=process.env.SEED_ADMIN_EMAIL||'admin@example.com';if(!await User.findOne({email}))await User.create({name:'Demo Admin',email,passwordHash:await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD||'Demo123!',12),role:'admin'});}
mongoose.connect(uri).then(async()=>{await seed();app.listen(port,()=>console.log(`TaskFlow API on ${port}`));}).catch(e=>{console.error(e);process.exit(1)});
