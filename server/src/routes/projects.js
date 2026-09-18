import express from 'express';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import {auth,allow} from '../middleware/auth.js';

const router=express.Router();
router.use(auth);

function accessFilter(user){
  return user.role==='admin'?{}:{$or:[{owner:user._id},{members:user._id}]};
}

async function canManage(user,project){
  return user.role==='admin'||(user.role==='manager'&&project.owner.toString()===user.id);
}

async function normalizeMembers(memberIds=[],ownerId){
  const unique=[...new Set([ownerId.toString(),...memberIds.map(String)])];
  const existing=await User.find({_id:{$in:unique}}).select('_id');
  return existing.map(u=>u._id);
}

router.get('/',async(req,res)=>{
  res.json(await Project.find(accessFilter(req.user))
    .populate('owner','name email role')
    .populate('members','name email role')
    .sort({updatedAt:-1}));
});

router.get('/:id',async(req,res)=>{
  const project=await Project.findOne({_id:req.params.id,...accessFilter(req.user)})
    .populate('owner','name email role')
    .populate('members','name email role');
  if(!project)return res.status(404).json({message:'Project not found'});
  res.json(project);
});

router.post('/',allow('admin','manager'),async(req,res)=>{
  const{name,description='',memberIds=[]}=req.body;
  if(!name?.trim())return res.status(400).json({message:'Project name required'});
  const members=await normalizeMembers(memberIds,req.user._id);
  const project=await Project.create({name:name.trim(),description:description.trim(),owner:req.user._id,members});
  res.status(201).json(await project.populate(['owner','members']));
});

router.patch('/:id',allow('admin','manager'),async(req,res)=>{
  const project=await Project.findById(req.params.id);
  if(!project)return res.status(404).json({message:'Project not found'});
  if(!await canManage(req.user,project))return res.status(403).json({message:'Only the project owner can edit this project'});
  if('name' in req.body){
    if(!req.body.name?.trim())return res.status(400).json({message:'Project name required'});
    project.name=req.body.name.trim();
  }
  if('description' in req.body)project.description=(req.body.description||'').trim();
  if(Array.isArray(req.body.memberIds))project.members=await normalizeMembers(req.body.memberIds,project.owner);
  await project.save();
  res.json(await project.populate(['owner','members']));
});

router.delete('/:id',allow('admin','manager'),async(req,res)=>{
  const project=await Project.findById(req.params.id);
  if(!project)return res.status(404).json({message:'Project not found'});
  if(!await canManage(req.user,project))return res.status(403).json({message:'Only the project owner can delete this project'});
  await Task.deleteMany({project:project._id});
  await project.deleteOne();
  res.status(204).end();
});

export default router;
