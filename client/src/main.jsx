import React,{useEffect,useMemo,useState}from'react';
import{createRoot}from'react-dom/client';
import{
  AlertTriangle,BarChart3,CalendarDays,CheckCircle2,ChevronRight,ClipboardList,
  Clock3,FolderKanban,LayoutDashboard,LogOut,Pencil,Plus,Search,Trash2,Users,X
}from'lucide-react';
import'./styles.css';

const API=import.meta.env.VITE_API_URL||'http://localhost:5001/api';
const emptyTask={title:'',description:'',project:'',priority:'medium',status:'todo',dueDate:'',assignee:''};
const emptyProject={name:'',description:'',memberIds:[]};
const statuses=[['todo','To do'],['in_progress','In progress'],['review','In review'],['done','Completed']];
const priorities=['low','medium','high','urgent'];

async function request(path,opts={}){
  const token=localStorage.getItem('token');
  const response=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...(opts.headers||{})}});
  if(response.status===204)return null;
  const text=await response.text();
  const data=text?JSON.parse(text):{};
  if(!response.ok){
    if(response.status===401&&token)localStorage.removeItem('token');
    throw new Error(data.message||'Request failed');
  }
  return data;
}

function fmtDate(date){return date?new Date(date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—'}
function dateInput(date){return date?new Date(date).toISOString().slice(0,10):''}
function statusLabel(value){return statuses.find(([key])=>key===value)?.[1]||value}
function initials(name='User'){return name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}

function Auth({onAuth}){
  const[mode,setMode]=useState('login');
  const[form,setForm]=useState({name:'',email:'admin@example.com',password:'Demo123!'});
  const[err,setErr]=useState('');
  const[busy,setBusy]=useState(false);
  async function submit(e){
    e.preventDefault();setErr('');setBusy(true);
    try{
      const data=await request(`/auth/${mode}`,{method:'POST',body:JSON.stringify(form)});
      localStorage.setItem('token',data.token);onAuth(data.user);
    }catch(e){setErr(e.message)}finally{setBusy(false)}
  }
  return <div className="authPage"><div className="authCard">
    <div className="mark"><CheckCircle2/>TaskFlow</div>
    <h1>{mode==='login'?'Welcome back':'Create your workspace'}</h1>
    <p>Plan projects, assign work, and keep your team moving.</p>
    <form onSubmit={submit}>
      {mode==='register'&&<input aria-label="Full name" placeholder="Full name" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>} 
      <input aria-label="Email" type="email" placeholder="Email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
      <input aria-label="Password" type="password" placeholder="Password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
      {err&&<div className="error">{err}</div>}
      <button disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}</button>
    </form>
    <small>{mode==='login'?'New here? ':'Already have an account? '}<button className="link" type="button" onClick={()=>{setErr('');setMode(mode==='login'?'register':'login')}}>{mode==='login'?'Create account':'Sign in'}</button></small>
  </div></div>
}

function Modal({title,onClose,children,wide=false}){
  return <div className="modal" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className={`modalCard ${wide?'wide':''}`}><div className="modalHeader"><h2>{title}</h2><button className="icon" onClick={onClose}><X/></button></div>{children}</div></div>
}

function App(){
  const[user,setUser]=useState(null),[projects,setProjects]=useState([]),[tasks,setTasks]=useState([]),[users,setUsers]=useState([]);
  const[view,setView]=useState('dashboard'),[selectedProjectId,setSelectedProjectId]=useState(null);
  const[q,setQ]=useState(''),[statusFilter,setStatusFilter]=useState(''),[projectFilter,setProjectFilter]=useState(''),[priorityFilter,setPriorityFilter]=useState('');
  const[taskModal,setTaskModal]=useState(null),[projectModal,setProjectModal]=useState(null);
  const[taskForm,setTaskForm]=useState(emptyTask),[projectForm,setProjectForm]=useState(emptyProject);
  const[loading,setLoading]=useState(true),[notice,setNotice]=useState(null);

  function toast(message,type='success'){setNotice({message,type});setTimeout(()=>setNotice(null),2800)}
  async function refresh(){
    const[p,t,u]=await Promise.all([request('/projects'),request('/tasks'),request('/users')]);
    setProjects(p);setTasks(t);setUsers(u);
  }
  useEffect(()=>{
    const token=localStorage.getItem('token');
    if(!token){setLoading(false);return}
    request('/auth/me').then(async u=>{setUser(u);await refresh()}).catch(()=>localStorage.removeItem('token')).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{if(user)refresh().catch(e=>toast(e.message,'error'))},[user]);

  const selectedProject=projects.find(p=>p._id===selectedProjectId)||null;
  const shown=useMemo(()=>tasks.filter(t=>
    (!q||(t.title+' '+(t.description||'')+' '+(t.project?.name||'')).toLowerCase().includes(q.toLowerCase()))&&
    (!statusFilter||t.status===statusFilter)&&(!projectFilter||t.project?._id===projectFilter)&&(!priorityFilter||t.priority===priorityFilter)
  ),[tasks,q,statusFilter,projectFilter,priorityFilter]);
  const counts=Object.fromEntries(statuses.map(([key])=>[key,tasks.filter(t=>t.status===key).length]));
  const completion=tasks.length?Math.round((counts.done/tasks.length)*100):0;
  const overdue=tasks.filter(t=>t.dueDate&&t.status!=='done'&&new Date(t.dueDate)<new Date(new Date().toDateString())).length;
  const recent=[...tasks].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,5);

  function openNewTask(projectId=''){
    if(!projects.length){toast('Create a project before adding tasks.','error');return}
    setTaskForm({...emptyTask,project:projectId||projects[0]?._id||'',assignee:user?._id||user?.id||''});setTaskModal({mode:'create'});
  }
  function openEditTask(task){
    setTaskForm({title:task.title,description:task.description||'',project:task.project?._id||'',priority:task.priority,status:task.status,dueDate:dateInput(task.dueDate),assignee:task.assignee?._id||''});
    setTaskModal({mode:'edit',item:task});
  }
  function openNewProject(){setProjectForm({...emptyProject,memberIds:[user?._id||user?.id].filter(Boolean)});setProjectModal({mode:'create'})}
  function openEditProject(project){setProjectForm({name:project.name,description:project.description||'',memberIds:(project.members||[]).map(m=>m._id)});setProjectModal({mode:'edit',item:project})}

  async function saveTask(e){
    e.preventDefault();
    try{
      const body={...taskForm,dueDate:taskForm.dueDate||null,assignee:taskForm.assignee||null};
      if(taskModal.mode==='edit')await request(`/tasks/${taskModal.item._id}`,{method:'PATCH',body:JSON.stringify(body)});
      else await request('/tasks',{method:'POST',body:JSON.stringify(body)});
      setTaskModal(null);setTaskForm(emptyTask);await refresh();toast(taskModal.mode==='edit'?'Task updated':'Task created');
    }catch(e){toast(e.message,'error')}
  }
  async function saveProject(e){
    e.preventDefault();
    try{
      if(projectModal.mode==='edit')await request(`/projects/${projectModal.item._id}`,{method:'PATCH',body:JSON.stringify(projectForm)});
      else await request('/projects',{method:'POST',body:JSON.stringify(projectForm)});
      setProjectModal(null);setProjectForm(emptyProject);await refresh();toast(projectModal.mode==='edit'?'Project updated':'Project created');
    }catch(e){toast(e.message,'error')}
  }
  async function setTaskStatus(task,status){try{await request(`/tasks/${task._id}`,{method:'PATCH',body:JSON.stringify({status})});await refresh();toast(`Moved to ${statusLabel(status)}`)}catch(e){toast(e.message,'error')}}
  async function deleteTask(task){if(!confirm(`Delete “${task.title}”?`))return;try{await request(`/tasks/${task._id}`,{method:'DELETE'});await refresh();toast('Task deleted')}catch(e){toast(e.message,'error')}}
  async function deleteProject(project){if(!confirm(`Delete “${project.name}” and all of its tasks? This cannot be undone.`))return;try{await request(`/projects/${project._id}`,{method:'DELETE'});if(selectedProjectId===project._id)setSelectedProjectId(null);await refresh();toast('Project deleted')}catch(e){toast(e.message,'error')}}

  if(loading)return <div className="splash"><div className="mark"><CheckCircle2/>TaskFlow</div><span>Loading workspace…</span></div>;
  if(!user)return <Auth onAuth={u=>{setUser(u);setLoading(false)}}/>;

  const canManage=['admin','manager'].includes(user.role);
  const activeProjectTasks=selectedProject?tasks.filter(t=>t.project?._id===selectedProject._id):[];
  const projectProgress=project=>{const pt=tasks.filter(t=>t.project?._id===project._id);return pt.length?Math.round(pt.filter(t=>t.status==='done').length/pt.length*100):0};

  return <div className="app">
    <aside>
      <div className="mark"><CheckCircle2/>TaskFlow</div>
      <nav>
        <button className={view==='dashboard'?'active':''} onClick={()=>{setView('dashboard');setSelectedProjectId(null)}}><LayoutDashboard/>Dashboard</button>
        <button className={view==='projects'?'active':''} onClick={()=>setView('projects')}><FolderKanban/>Projects <span>{projects.length}</span></button>
        <button className={view==='team'?'active':''} onClick={()=>setView('team')}><Users/>Team <span>{users.length}</span></button>
      </nav>
      <div className="profile"><div className="avatar">{initials(user.name)}</div><div><b>{user.name}</b><small>{user.role}</small></div><button title="Sign out" onClick={()=>{localStorage.removeItem('token');setUser(null)}}><LogOut/></button></div>
    </aside>

    <main>
      {view==='dashboard'&&<>
        <header><div><span>WORKSPACE</span><h1>Team task dashboard</h1><p className="subtitle">Track delivery, priorities, and team progress in one place.</p></div><div className="actions">{canManage&&<button className="secondary" onClick={openNewProject}><Plus/>Project</button>}<button onClick={()=>openNewTask()}><Plus/>New task</button></div></header>
        <section className="metrics">
          <div><span>TO DO</span><b>{counts.todo}</b><small>Ready to start</small></div><div><span>IN PROGRESS</span><b>{counts.in_progress}</b><small>Work underway</small></div><div><span>IN REVIEW</span><b>{counts.review}</b><small>Awaiting review</small></div><div><span>COMPLETED</span><b>{counts.done}</b><small>{completion}% completion</small></div>
        </section>
        <section className="overviewGrid">
          <div className="panel progressPanel"><div className="panelTitle"><div><span>SPRINT HEALTH</span><h3>Overall progress</h3></div><BarChart3/></div><div className="bigPercent">{completion}%</div><div className="progress"><i style={{width:`${completion}%`}}/></div><div className="progressMeta"><span>{tasks.length} total tasks</span><span>{overdue?`${overdue} overdue`:'No overdue tasks'}</span></div></div>
          <div className="panel"><div className="panelTitle"><div><span>RECENT ACTIVITY</span><h3>Latest updates</h3></div><Clock3/></div><div className="activityList">{recent.length?recent.map(t=><button key={t._id} onClick={()=>openEditTask(t)}><span className={`dot ${t.status}`}/><div><b>{t.title}</b><small>{t.project?.name} · {statusLabel(t.status)}</small></div><ChevronRight/></button>):<div className="miniEmpty">Your recent task updates will appear here.</div>}</div></div>
        </section>
        <TaskWorkspace title="All tasks" tasks={shown} projects={projects} q={q} setQ={setQ} projectFilter={projectFilter} setProjectFilter={setProjectFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter} onEdit={openEditTask} onDelete={deleteTask} onStatus={setTaskStatus}/>
      </>}

      {view==='projects'&&!selectedProject&&<>
        <header><div><span>PROJECTS</span><h1>Project portfolio</h1><p className="subtitle">See ownership, progress, and delivery status across the workspace.</p></div>{canManage&&<div className="actions"><button onClick={openNewProject}><Plus/>New project</button></div>}</header>
        <section className="projectGrid">{projects.map(project=>{
          const pt=tasks.filter(t=>t.project?._id===project._id),done=pt.filter(t=>t.status==='done').length,progress=projectProgress(project);
          return <article className="projectCard" key={project._id} onClick={()=>setSelectedProjectId(project._id)}>
            <div className="projectTop"><div className="projectIcon"><FolderKanban/></div>{canManage&&<div className="cardActions" onClick={e=>e.stopPropagation()}><button title="Edit project" onClick={()=>openEditProject(project)}><Pencil/></button><button title="Delete project" onClick={()=>deleteProject(project)}><Trash2/></button></div>}</div>
            <h3>{project.name}</h3><p>{project.description||'No description yet.'}</p>
            <div className="memberStack">{(project.members||[]).slice(0,4).map(m=><span key={m._id} title={m.name}>{initials(m.name)}</span>)}{(project.members||[]).length>4&&<em>+{project.members.length-4}</em>}</div>
            <div className="projectStats"><span><b>{pt.length}</b> tasks</span><span><b>{done}</b> done</span><span><b>{progress}%</b></span></div>
            <div className="progress"><i style={{width:`${progress}%`}}/></div>
          </article>
        })}{!projects.length&&<div className="emptyCard"><FolderKanban/><h3>No projects yet</h3><p>Create your first project to organize tasks and teammates.</p>{canManage&&<button onClick={openNewProject}><Plus/>Create project</button>}</div>}</section>
      </>}

      {view==='projects'&&selectedProject&&<>
        <button className="backButton" onClick={()=>setSelectedProjectId(null)}>← Back to projects</button>
        <header><div><span>PROJECT</span><h1>{selectedProject.name}</h1><p className="subtitle">{selectedProject.description||'No project description.'}</p></div><div className="actions">{canManage&&<button className="secondary" onClick={()=>openEditProject(selectedProject)}><Pencil/>Edit</button>}<button onClick={()=>openNewTask(selectedProject._id)}><Plus/>New task</button></div></header>
        <section className="projectDetailMeta"><div><span>OWNER</span><b>{selectedProject.owner?.name||'—'}</b></div><div><span>TEAM</span><b>{selectedProject.members?.length||0} members</b></div><div><span>TASKS</span><b>{activeProjectTasks.length}</b></div><div><span>PROGRESS</span><b>{projectProgress(selectedProject)}%</b></div></section>
        <div className="projectTeam panel"><div className="panelTitle"><div><span>PROJECT TEAM</span><h3>Members</h3></div><Users/></div><div className="teamInline">{(selectedProject.members||[]).map(member=><div key={member._id}><span className="avatar light">{initials(member.name)}</span><p><b>{member.name}</b><small>{member.email}</small></p></div>)}</div></div>
        <TaskWorkspace title="Project tasks" tasks={activeProjectTasks} projects={projects} q={q} setQ={setQ} projectFilter="" setProjectFilter={()=>{}} statusFilter={statusFilter} setStatusFilter={setStatusFilter} priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter} hideProjectFilter onEdit={openEditTask} onDelete={deleteTask} onStatus={setTaskStatus}/>
      </>}

      {view==='team'&&<>
        <header><div><span>TEAM</span><h1>Workspace members</h1><p className="subtitle">People collaborating across TaskFlow projects.</p></div></header>
        <section className="teamGrid">{users.map(member=>{
          const memberProjects=projects.filter(p=>p.owner?._id===member._id||p.members?.some(m=>m._id===member._id));
          const assigned=tasks.filter(t=>t.assignee?._id===member._id);
          return <article className="memberCard" key={member._id}><div className="memberHead"><span className="avatar large">{initials(member.name)}</span><span className={`roleBadge ${member.role}`}>{member.role}</span></div><h3>{member.name}</h3><p>{member.email}</p><div className="memberStats"><div><b>{memberProjects.length}</b><span>Projects</span></div><div><b>{assigned.length}</b><span>Assigned</span></div><div><b>{assigned.filter(t=>t.status==='done').length}</b><span>Done</span></div></div></article>
        })}</section>
      </>}
    </main>

    {taskModal&&<Modal title={taskModal.mode==='edit'?'Edit task':'Create task'} onClose={()=>setTaskModal(null)}><form className="formGrid" onSubmit={saveTask}>
      <label>Task title<input required value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})}/></label>
      <label>Description<textarea value={taskForm.description} onChange={e=>setTaskForm({...taskForm,description:e.target.value})}/></label>
      <div className="two"><label>Project<select required value={taskForm.project} onChange={e=>setTaskForm({...taskForm,project:e.target.value,assignee:''})}><option value="">Choose project</option>{projects.map(p=><option value={p._id} key={p._id}>{p.name}</option>)}</select></label><label>Assignee<select value={taskForm.assignee} onChange={e=>setTaskForm({...taskForm,assignee:e.target.value})}><option value="">Unassigned</option>{users.filter(u=>{const p=projects.find(p=>p._id===taskForm.project);return !p||p.owner?._id===u._id||p.members?.some(m=>m._id===u._id)}).map(u=><option value={u._id} key={u._id}>{u.name}</option>)}</select></label></div>
      <div className="three"><label>Status<select value={taskForm.status} onChange={e=>setTaskForm({...taskForm,status:e.target.value})}>{statuses.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label>Priority<select value={taskForm.priority} onChange={e=>setTaskForm({...taskForm,priority:e.target.value})}>{priorities.map(p=><option value={p} key={p}>{p[0].toUpperCase()+p.slice(1)}</option>)}</select></label><label>Due date<input type="date" value={taskForm.dueDate} onChange={e=>setTaskForm({...taskForm,dueDate:e.target.value})}/></label></div>
      <div className="modalActions"><button type="button" className="secondary" onClick={()=>setTaskModal(null)}>Cancel</button><button>{taskModal.mode==='edit'?'Save changes':'Create task'}</button></div>
    </form></Modal>}

    {projectModal&&<Modal title={projectModal.mode==='edit'?'Edit project':'Create project'} onClose={()=>setProjectModal(null)} wide><form className="formGrid" onSubmit={saveProject}>
      <label>Project name<input required value={projectForm.name} onChange={e=>setProjectForm({...projectForm,name:e.target.value})}/></label>
      <label>Description<textarea value={projectForm.description} onChange={e=>setProjectForm({...projectForm,description:e.target.value})}/></label>
      <fieldset className="memberPicker"><legend>Project members</legend><p>Select the teammates who should have access to this project.</p><div>{users.map(member=><label key={member._id}><input type="checkbox" checked={projectForm.memberIds.includes(member._id)} disabled={projectModal.mode==='edit'&&projectModal.item.owner?._id===member._id} onChange={e=>setProjectForm({...projectForm,memberIds:e.target.checked?[...projectForm.memberIds,member._id]:projectForm.memberIds.filter(id=>id!==member._id)})}/><span className="avatar tiny">{initials(member.name)}</span><span><b>{member.name}</b><small>{member.email}</small></span><em>{member.role}</em></label>)}</div></fieldset>
      <div className="modalActions"><button type="button" className="secondary" onClick={()=>setProjectModal(null)}>Cancel</button><button>{projectModal.mode==='edit'?'Save changes':'Create project'}</button></div>
    </form></Modal>}

    {notice&&<div className={`toast ${notice.type}`}>{notice.type==='error'?<AlertTriangle/>:<CheckCircle2/>}{notice.message}</div>}
  </div>
}

function TaskWorkspace({title,tasks,projects,q,setQ,projectFilter,setProjectFilter,statusFilter,setStatusFilter,priorityFilter,setPriorityFilter,hideProjectFilter=false,onEdit,onDelete,onStatus}){
  return <section className="taskWorkspace"><div className="sectionTitle"><div><span>TASKS</span><h2>{title}</h2></div><span className="taskCount">{tasks.length} shown</span></div><section className="toolbar"><div className="search"><Search/><input placeholder="Search tasks" value={q} onChange={e=>setQ(e.target.value)}/></div>{!hideProjectFilter&&<select value={projectFilter} onChange={e=>setProjectFilter(e.target.value)}><option value="">All projects</option>{projects.map(p=><option value={p._id} key={p._id}>{p.name}</option>)}</select>}<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">All statuses</option>{statuses.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}><option value="">All priorities</option>{priorities.map(p=><option value={p} key={p}>{p[0].toUpperCase()+p.slice(1)}</option>)}</select></section><section className="tasks"><div className="thead"><span>Task</span><span>Project</span><span>Assignee</span><span>Priority</span><span>Status</span><span>Due</span><span></span></div>{tasks.map(task=><div className="row" key={task._id}><button className="taskName" onClick={()=>onEdit(task)}><b>{task.title}</b><small>{task.description||'No description'}</small></button><span>{task.project?.name||'—'}</span><span className="assigneeCell">{task.assignee?<><i>{initials(task.assignee.name)}</i>{task.assignee.name}</>:'Unassigned'}</span><span className={`priority ${task.priority}`}>{task.priority}</span><select className={`status ${task.status}`} value={task.status} onChange={e=>onStatus(task,e.target.value)}>{statuses.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><span className={task.dueDate&&task.status!=='done'&&new Date(task.dueDate)<new Date()?'due overdue':'due'}>{task.dueDate?<><CalendarDays/>{fmtDate(task.dueDate)}</>:'—'}</span><div className="rowActions"><button title="Edit task" onClick={()=>onEdit(task)}><Pencil/></button><button title="Delete task" onClick={()=>onDelete(task)}><Trash2/></button></div></div>)}{!tasks.length&&<div className="empty"><ClipboardList/><b>No tasks match these filters</b><span>Try adjusting the search or filters.</span></div>}</section></section>
}

createRoot(document.getElementById('root')).render(<App/>);
