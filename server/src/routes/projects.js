import express from 'express'; import Project from '../models/Project.js'; import Task from '../models/Task.js'; import {auth,allow} from '../middleware/auth.js';
const router=express.Router(); router.use(auth);
router.get('/',async(req,res)=>{const filter=req.user.role==='admin'?{}:{$or:[{owner:req.user._id},{members:req.user._id}]};res.json(await Project.find(filter).populate('owner','name email').populate('members','name email').sort({createdAt:-1}));});
router.post('/',allow('admin','manager'),async(req,res)=>{const{name,description=''}=req.body;if(!name)return res.status(400).json({message:'Project name required'});const p=await Project.create({name,description,owner:req.user._id,members:[req.user._id]});res.status(201).json(p);});
router.delete('/:id',allow('admin','manager'),async(req,res)=>{const p=await Project.findById(req.params.id);if(!p)return res.status(404).json({message:'Not found'});if(req.user.role!=='admin'&&p.owner.toString()!==req.user.id)return res.status(403).json({message:'Only project owner can delete'});await Task.deleteMany({project:p._id});await p.deleteOne();res.status(204).end();});
export default router;
