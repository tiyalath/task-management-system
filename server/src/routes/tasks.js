import express from 'express';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import {auth} from '../middleware/auth.js';

const router=express.Router();
router.use(auth);

async function getProjectForAccess(user,projectId){
  if(user.role==='admin')return Project.findById(projectId);
  return Project.findOne({_id:projectId,$or:[{owner:user._id},{members:user._id}]});
}

async function assigneeAllowed(project,userId){
  if(!userId)return true;
  const user=await User.findById(userId).select('_id');
  if(!user)return false;
  return project.owner.toString()===userId||project.members.some(m=>m.toString()===userId);
}

router.get('/',async(req,res)=>{
  const projects=req.user.role==='admin'
    ?await Project.find().select('_id')
    :await Project.find({$or:[{owner:req.user._id},{members:req.user._id}]}).select('_id');
  const allowedIds=projects.map(p=>p._id);
  const filter={project:{$in:allowedIds}};
  if(req.query.project&&allowedIds.some(id=>id.toString()===req.query.project))filter.project=req.query.project;
  if(req.query.status)filter.status=req.query.status;
  if(req.query.priority)filter.priority=req.query.priority;
  if(req.query.q)filter.$or=[{title:{$regex:req.query.q,$options:'i'}},{description:{$regex:req.query.q,$options:'i'}}];
  res.json(await Task.find(filter)
    .populate('project','name')
    .populate('assignee','name email role')
    .populate('creator','name email')
    .sort({updatedAt:-1}));
});

router.post('/',async(req,res)=>{
  const{title,description='',project,status='todo',priority='medium',dueDate=null,assignee=null}=req.body;
  if(!title?.trim()||!project)return res.status(400).json({message:'Title and project required'});
  const p=await getProjectForAccess(req.user,project);
  if(!p)return res.status(403).json({message:'No project access'});
  const assigneeId=assignee||req.user._id;
  if(!await assigneeAllowed(p,assigneeId.toString()))return res.status(400).json({message:'Assignee must be a project member'});
  const task=await Task.create({title:title.trim(),description:description.trim(),project,status,priority,dueDate:dueDate||null,creator:req.user._id,assignee:assigneeId});
  res.status(201).json(await task.populate(['project','assignee','creator']));
});

router.patch('/:id',async(req,res)=>{
  const task=await Task.findById(req.params.id);
  if(!task)return res.status(404).json({message:'Task not found'});
  const currentProject=await getProjectForAccess(req.user,task.project);
  if(!currentProject)return res.status(403).json({message:'No project access'});

  let targetProject=currentProject;
  if(req.body.project&&req.body.project.toString()!==task.project.toString()){
    targetProject=await getProjectForAccess(req.user,req.body.project);
    if(!targetProject)return res.status(403).json({message:'No access to target project'});
    task.project=req.body.project;
  }
  if('assignee' in req.body){
    if(req.body.assignee&&!await assigneeAllowed(targetProject,req.body.assignee.toString()))return res.status(400).json({message:'Assignee must be a project member'});
    task.assignee=req.body.assignee||null;
  }
  for(const key of ['title','description','status','priority','dueDate']){
    if(key in req.body)task[key]=key==='dueDate'?(req.body[key]||null):req.body[key];
  }
  if(!task.title?.trim())return res.status(400).json({message:'Task title required'});
  task.title=task.title.trim();
  task.description=(task.description||'').trim();
  await task.save();
  res.json(await task.populate(['project','assignee','creator']));
});

router.delete('/:id',async(req,res)=>{
  const task=await Task.findById(req.params.id);
  if(!task)return res.status(404).json({message:'Task not found'});
  if(!await getProjectForAccess(req.user,task.project))return res.status(403).json({message:'No project access'});
  await task.deleteOne();
  res.status(204).end();
});

export default router;
