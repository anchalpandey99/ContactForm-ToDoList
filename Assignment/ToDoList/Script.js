const TODOS_KEY = 'todos_v1';
const SEARCH_DEBOUNCE = 400;

function debounce(fn, delay = SEARCH_DEBOUNCE) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function uid() {
  return Date.now().toString(36) + Math.floor(Math.random()*1000).toString(36);
}

function escapeHtml(s=''){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");}

// --- LocalStorage Safe Wrappers ---
function loadTodos(){try{const t=localStorage.getItem(TODOS_KEY);if(!t)return[];const p=JSON.parse(t);if(!Array.isArray(p))throw new Error('Invalid');return p}catch(e){console.error(e);try{localStorage.removeItem(TODOS_KEY)}catch{}return[]}}
function saveTodos(todos){try{localStorage.setItem(TODOS_KEY,JSON.stringify(todos));return true}catch(e){console.error(e);alert('Cannot save todos');return false}}

// --- State ---
let todos = loadTodos();
let currentFilter='all';
let currentSearch='';

// --- DOM Refs ---
const todoInput=document.getElementById('todoInput');
const addTodoBtn=document.getElementById('addTodoBtn');
const searchInput=document.getElementById('searchInput');
const filtersContainer=document.querySelector('.filters');
const todoList=document.getElementById('todoList');
const counterEl=document.getElementById('counter');
const emptyTodosEl=document.getElementById('emptyTodos');
const noResultsEl=document.getElementById('noResults');

// --- Render ---
function updateCounter(){
  const total=todos.length;
  const completed=todos.filter(t=>t.completed).length;
  counterEl.textContent=`Todos: ${total} | Completed: ${completed}`;
}

function renderTodos(){
  let filtered = todos.filter(t=>{
    if(currentFilter==='active') return !t.completed;
    if(currentFilter==='completed') return t.completed;
    return true;
  });

  if(currentSearch) filtered = filtered.filter(t=>t.text.toLowerCase().includes(currentSearch.toLowerCase()));

  todoList.innerHTML='';
  emptyTodosEl.hidden = todos.length>0;
  noResultsEl.hidden = filtered.length>0;

  if(filtered.length===0) return;

  filtered.slice().reverse().forEach(t=>{
    const li=document.createElement('li');
    li.className='todo-item';
    li.dataset.id=t.id;
    li.innerHTML=`
      <div class="todo-left">
        <input type="checkbox" class="toggle" ${t.completed?'checked':''} />
        <div>
          <div class="todo-text ${t.completed?'completed':''}">${escapeHtml(t.text)}</div>
          <div class="todo-meta">Created: ${new Date(t.createdAt).toLocaleString()}</div>
        </div>
      </div>
      <div class="todo-actions">
        <button class="delete-btn" data-id="${t.id}">Delete</button>
      </div>
    `;
    todoList.appendChild(li);
  });

  updateCounter();
}

// --- Actions ---
function addTodo(){
  const text=todoInput.value.trim();
  if(!text){todoInput.focus();return;}
  const newTodo={id:uid(),text,completed:false,createdAt:new Date().toISOString()};
  todos.push(newTodo);
  saveTodos(todos);
  todoInput.value='';
  renderTodos();
}

function toggleTodoById(id){
  const t=todos.find(x=>x.id===id); if(!t) return;
  t.completed=!t.completed;
  saveTodos(todos); renderTodos();
}

function deleteTodoById(id){
  todos=todos.filter(t=>t.id!==id);
  saveTodos(todos); renderTodos();
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded',()=>{
  renderTodos();

  addTodoBtn.addEventListener('click', addTodo);
  todoInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addTodo();}});

  // Event delegation for toggles & deletes
  todoList.addEventListener('change', e=>{
    if(e.target.matches('.toggle')){
      const li=e.target.closest('.todo-item');
      if(!li) return;
      toggleTodoById(li.dataset.id);
    }
  });
  todoList.addEventListener('click', e=>{
    const btn=e.target.closest('.delete-btn');
    if(!btn) return;
    deleteTodoById(btn.dataset.id);
  });

  // Filter buttons
  filtersContainer.addEventListener('click', e=>{
    const btn=e.target.closest('.filter-btn');
    if(!btn) return;
    filtersContainer.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter=btn.dataset.filter||'all';
    renderTodos();
  });

  // Debounced search
  searchInput.addEventListener('input',debounce(e=>{
    currentSearch=e.target.value;
    renderTodos();
  },400));
});
