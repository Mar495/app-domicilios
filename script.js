const quickValues = [5000,6000,7000,8000,10000,12000,15000,20000];

let currentUser = JSON.parse(localStorage.getItem("current-user")) || null;
let records = [];
let historyVisible = false;

const $ = id => document.getElementById(id);

function userKey(){
  return `domicilios-${currentUser.email}`;
}

function loadRecords(){
  records = JSON.parse(localStorage.getItem(userKey())) || [];
}

function save(){
  localStorage.setItem(userKey(), JSON.stringify(records));
}

function money(value){
  return new Intl.NumberFormat("es-CO",{
    style:"currency",
    currency:"COP",
    maximumFractionDigits:0
  }).format(value || 0);
}

function currentDate(){
  return new Date().toISOString().split("T")[0];
}

function currentTime(){
  return new Date().toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"});
}

function showToast(text){
  $("toast").innerText = text;
  $("toast").classList.remove("hidden");
  setTimeout(()=>$("toast").classList.add("hidden"),1800);
}

function getUsers(){
  return JSON.parse(localStorage.getItem("domi-users")) || [];
}

function saveUsers(users){
  localStorage.setItem("domi-users", JSON.stringify(users));
}

function register(){
  const name = $("loginName").value.trim();
  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value;

  if(!name || !email || !password){
    alert("Completa usuario, correo y contraseña.");
    return;
  }

  const users = getUsers();

  if(users.some(u=>u.email === email)){
    alert("Ese correo ya está registrado.");
    return;
  }

  const user = {name,email,password};
  users.push(user);
  saveUsers(users);

  currentUser = {name,email};
  localStorage.setItem("current-user", JSON.stringify(currentUser));

  startApp();
}

function login(){
  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value;
  const users = getUsers();

  const user = users.find(u=>u.email === email && u.password === password);

  if(!user){
    alert("Usuario o contraseña incorrectos.");
    return;
  }

  currentUser = {name:user.name,email:user.email};
  localStorage.setItem("current-user", JSON.stringify(currentUser));

  startApp();
}

function logout(){
  localStorage.removeItem("current-user");
  location.reload();
}

function startApp(){
  $("loginScreen").classList.add("hidden");
  $("appScreen").classList.remove("hidden");
  $("userInfo").innerText = `Usuario: ${currentUser.name} - ${currentUser.email}`;
  loadRecords();
  renderButtons();
  render();
}

function addRecord(value,type,note=""){
  records.unshift({
    id:crypto.randomUUID(),
    value:Number(value),
    type,
    note,
    date:currentDate(),
    time:currentTime()
  });

  save();
  render();
  showToast(type === "income" ? `Domicilio ${money(value)} guardado` : `Gasto ${money(value)} guardado`);
}

function renderButtons(){
  $("quickButtons").innerHTML = "";

  quickValues.forEach(value=>{
    const btn = document.createElement("button");
    btn.className = "quick-btn";
    btn.innerHTML = money(value);
    btn.onclick = ()=>addRecord(value,"income","");
    $("quickButtons").appendChild(btn);
  });
}

function renderDates(){
  const actual = $("selectedDate").value || currentDate();
  let dates = [...new Set(records.map(r=>r.date))];

  if(!dates.includes(currentDate())) dates.push(currentDate());

  dates.sort().reverse();
  $("selectedDate").innerHTML = "";

  dates.forEach(date=>{
    const option = document.createElement("option");
    option.value = date;
    option.innerText = date === currentDate() ? `Hoy - ${date}` : date;
    if(date === actual) option.selected = true;
    $("selectedDate").appendChild(option);
  });
}

function recordsByDate(date){
  return records.filter(r=>r.date === date);
}

function sum(list,type){
  return list
    .filter(r=>r.type === type)
    .reduce((acc,r)=>acc + Number(r.value),0);
}

function getWeekRecords(){
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0,0,0,0);

  return records.filter(r=>new Date(r.date) >= monday);
}

function getMonthRecords(){
  const month = currentDate().slice(0,7);
  return records.filter(r=>r.date.startsWith(month));
}

function render(){
  renderDates();

  const selected = $("selectedDate").value || currentDate();
  const dayRecords = recordsByDate(selected);

  const income = sum(dayRecords,"income");
  const expenses = sum(dayRecords,"expense");
  const services = dayRecords.filter(r=>r.type==="income").length;

  $("totalDay").innerText = money(income);
  $("countDay").innerText = services;
  $("netDay").innerText = money(income - expenses);
  $("averageDay").innerText = money(services ? Math.round(income/services) : 0);
  $("weekTotal").innerText = money(sum(getWeekRecords(),"income") - sum(getWeekRecords(),"expense"));
  $("monthTotal").innerText = money(sum(getMonthRecords(),"income") - sum(getMonthRecords(),"expense"));

  renderRecords(dayRecords);
}

function renderRecords(list){
  $("recordsList").innerHTML = "";

  if(list.length === 0){
    $("recordsList").innerHTML = "<p>No hay registros para este día.</p>";
    return;
  }

  list.forEach(record=>{
    const div = document.createElement("div");
    div.className = "record";

    div.innerHTML = `
      <div>
        <strong>${record.type === "expense" ? "-" : "+"} ${money(record.value)}</strong><br>
        <small>${record.type === "expense" ? "Gasto" : "Domicilio"} - ${record.date} - ${record.time}</small>
        <p>${record.note || ""}</p>
      </div>
      <div class="record-actions">
        <button onclick="editRecord('${record.id}')">✏️</button>
        <button class="danger" onclick="deleteRecord('${record.id}')">🗑</button>
      </div>
    `;

    $("recordsList").appendChild(div);
  });
}

function editRecord(id){
  const record = records.find(r=>r.id === id);
  if(!record) return;

  const newValue = prompt("Nuevo valor:", record.value);
  if(!newValue) return;

  const newNote = prompt("Nueva nota:", record.note || "");

  record.value = Number(newValue);
  record.note = newNote || "";
  save();
  render();
  showToast("Registro editado");
}

function deleteRecord(id){
  records = records.filter(r=>r.id !== id);
  save();
  render();
}

function exportToCsv(list,fileName){
  if(list.length === 0){
    alert("No hay registros para exportar.");
    return;
  }

  const income = sum(list,"income");
  const expenses = sum(list,"expense");
  const services = list.filter(r=>r.type==="income").length;
  const net = income - expenses;

  let csv = "\ufeff";
  csv += "RESUMEN\n";
  csv += `Total domicilios;${services}\n`;
  csv += `Ingresos;${income}\n`;
  csv += `Gastos;${expenses}\n`;
  csv += `Ganancia neta;${net}\n\n`;
  csv += "Fecha;Hora;Tipo;Valor;Nota\n";

  list.forEach(r=>{
    csv += `${r.date};${r.time};${r.type === "income" ? "Domicilio" : "Gasto"};${r.value};${r.note || ""}\n`;
  });

  const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function exportRange(){
  const start = $("rangeStart").value;
  const end = $("rangeEnd").value;

  if(!start || !end){
    alert("Selecciona fecha inicial y final.");
    return;
  }

  const list = records.filter(r=>r.date >= start && r.date <= end);
  exportToCsv(list,`domicilios-rango-${start}-a-${end}.csv`);
}

function backup(){
  const blob = new Blob([JSON.stringify(records,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `copia-domicilios-${currentDate()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function restore(event){
  const file = event.target.files[0];
  if(!file) return;

  const reader = new FileReader();

  reader.onload = e=>{
    try{
      const imported = JSON.parse(e.target.result);

      if(!Array.isArray(imported)){
        alert("Archivo no válido.");
        return;
      }

      if(!confirm("Esto reemplazará el historial actual. ¿Continuar?")) return;

      records = imported;
      save();
      render();
      showToast("Copia restaurada");
    }catch{
      alert("No se pudo restaurar la copia.");
    }
  };

  reader.readAsText(file);
}

function clearDay(){
  const selected = $("selectedDate").value || currentDate();
  if(!confirm("¿Borrar todos los registros de este día?")) return;

  records = records.filter(r=>r.date !== selected);
  save();
  render();
}

function clearAll(){
  if(!confirm("Antes de borrar todo, asegúrate de haber exportado o hecho copia. ¿Continuar?")) return;

  records = [];
  save();
  render();
}

$("registerBtn").onclick = register;
$("loginBtn").onclick = login;
$("logoutBtn").onclick = logout;

$("addCustomBtn").onclick = ()=>{
  const value = Number($("customValue").value);
  const note = $("customNote").value;

  if(!value){
    alert("Escribe un valor válido.");
    return;
  }

  addRecord(value,"income",note);
  $("customValue").value = "";
  $("customNote").value = "";
};

$("addExpenseBtn").onclick = ()=>{
  const value = Number($("expenseValue").value);
  const note = $("expenseNote").value || "Gasto";

  if(!value){
    alert("Escribe un gasto válido.");
    return;
  }

  addRecord(value,"expense",note);
  $("expenseValue").value = "";
  $("expenseNote").value = "";
};

$("undoBtn").onclick = ()=>{
  if(records.length === 0) return;
  records.shift();
  save();
  render();
};

$("exportDayBtn").onclick = ()=>{
  const selected = $("selectedDate").value || currentDate();
  exportToCsv(recordsByDate(selected),`domicilios-dia-${selected}.csv`);
};

$("exportAllBtn").onclick = ()=>{
  exportToCsv(records,`domicilios-todo-${currentDate()}.csv`);
};

$("exportRangeBtn").onclick = exportRange;
$("backupBtn").onclick = backup;
$("restoreBtn").onclick = ()=>$("restoreInput").click();
$("restoreInput").onchange = restore;
$("clearDayBtn").onclick = clearDay;
$("clearAllBtn").onclick = clearAll;
$("selectedDate").onchange = render;

$("toggleHistoryBtn").onclick = ()=>{
  historyVisible = !historyVisible;

  if(historyVisible){
    $("recordsList").classList.remove("hidden");
    $("toggleHistoryBtn").innerText = "👁 Ocultar";
  }else{
    $("recordsList").classList.add("hidden");
    $("toggleHistoryBtn").innerText = "👁 Mostrar";
  }
};

if(currentUser){
  startApp();
}