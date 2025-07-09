// ====================================================
// DATOS INICIALES Y VARIABLES GLOBALES
// ====================================================
const datosDashboard = {
  tareas: "3 pendientes",
  eventos: "Reunión a las 18:00",
  progreso: "60% completado",
  rutina: "Mañana productiva"
};

let tareasGuardadas = JSON.parse(localStorage.getItem("tareas")) || [];

const DOM = {
  lista: document.getElementById("lista-tareas"),
  filtroDia: document.getElementById("filtro-dia"),
  notificacion: document.getElementById("notificacion"),
  botonesSemana: document.querySelectorAll("#botones-semana button"),
  ctxGrafica: document.getElementById("grafica-progreso")?.getContext("2d"),
  formTarea: document.getElementById("form-tarea"),
  stats: document.getElementById("estadisticas"),
  historial: document.getElementById("lista-historial"),

  // Pomodoro
  inputTiempoTrabajo: document.getElementById("inputTiempoTrabajo"),
  inputTiempoDescanso: document.getElementById("inputTiempoDescanso"),
  btnIniciarPomodoro: document.getElementById("btnIniciarPomodoro"),
  btnPausarPomodoro: document.getElementById("btnPausarPomodoro"),
  btnReiniciarConfig: document.getElementById("btnReiniciarConfig"),
  notificacionVisual: document.getElementById("notificacion-visual"),
  sonidoAlertaEl: document.getElementById("sonidoAlerta"),
  listaHistorial: document.getElementById("lista-historial"),
  estadoEl: document.getElementById("estado"),
  tiempoEl: document.getElementById("tiempoEl"),
  sesionesCompletadasEl: document.getElementById("sesiones-completadas"),
};

const sonidoAlerta = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');

// Variables temporizador Pomodoro
let tiempoTrabajo = parseInt(DOM.inputTiempoTrabajo.value) * 60; // en segundos
let tiempoDescanso = parseInt(DOM.inputTiempoDescanso.value) * 60; // en segundos
let tiempoRestante = tiempoTrabajo;
let enTrabajo = true; // true = trabajo, false = descanso
let temporizadorID = null;
let sesionesCompletadas = 0;

// ====================================================
// FUNCIONES DEL DASHBOARD Y GESTIÓN DE TAREAS
// ====================================================
function actualizarDashboard(data) {
  document.querySelector("#tareas .card-content").textContent = data.tareas;
  document.querySelector("#eventos .card-content").textContent = data.eventos;
  document.querySelector("#progreso .card-content").textContent = data.progreso;
  document.querySelector("#rutina .card-content").textContent = data.rutina;
}

function guardarCambios() {
  localStorage.setItem("tareas", JSON.stringify(tareasGuardadas));
  guardarEstadisticas();
  mostrarTareas(DOM.filtroDia?.value || "todos");
  mostrarEstadisticas();
  actualizarSeguimiento();
}

function eliminarTarea(index) {
  tareasGuardadas.splice(index, 1);
  guardarCambios();
}

function toggleCompletado(index) {
  tareasGuardadas[index].completado = !tareasGuardadas[index].completado;
  guardarCambios();
}

function editarTarea(index) {
  const tarea = tareasGuardadas[index];
  const nuevoTexto = prompt("Editar tarea:", tarea.texto);
  const nuevaFecha = prompt("Editar fecha (YYYY-MM-DD):", tarea.fecha);
  const nuevaHora = prompt("Editar hora (HH:MM):", tarea.hora);

  if (nuevoTexto && nuevaFecha && nuevaHora) {
    tareasGuardadas[index] = { ...tarea, texto: nuevoTexto, fecha: nuevaFecha, hora: nuevaHora };
    guardarCambios();
  }
}

// ====================================================
// FUNCIONES PARA MOSTRAR TAREAS Y CALENDARIO
// ====================================================
function mostrarCalendario() {
  const vista = document.getElementById("vista-calendario");
  if (!vista) return;

  vista.innerHTML = "";
  const fechas = [...new Set(tareasGuardadas.map(t => t.fecha))].sort();

  fechas.forEach(fecha => {
    const div = document.createElement("div");
    div.classList.add("calendario-día");
    div.textContent = fecha;
    vista.appendChild(div);
  });
}

function mostrarTareas(diaFiltro = "todos") {
  DOM.lista.innerHTML = "";

  let tareasFiltradas, indicesMapeados;

  if (diaFiltro === "todos") {
    tareasFiltradas = [...tareasGuardadas];
    indicesMapeados = tareasFiltradas.map((_, i) => i);
  } else {
    tareasFiltradas = tareasGuardadas.filter(t => new Date(t.fecha).getDay() === Number(diaFiltro));
    indicesMapeados = tareasFiltradas.map(t => tareasGuardadas.indexOf(t));
  }

  if (tareasFiltradas.length === 0) {
    DOM.lista.innerHTML = "<p>No hay tareas para este día.</p>";
    actualizarDashboard({ ...datosDashboard, tareas: "0 pendientes" });
    mostrarCalendario();
    return;
  }

  const tareasPorFecha = {};
  tareasFiltradas.forEach((t, i) => {
    if (!tareasPorFecha[t.fecha]) tareasPorFecha[t.fecha] = [];
    tareasPorFecha[t.fecha].push({ ...t, index: indicesMapeados[i] });
  });

  Object.keys(tareasPorFecha).sort().forEach(fecha => {
    const titulo = document.createElement("h4");
    titulo.textContent = `📅 ${fecha}`;
    DOM.lista.appendChild(titulo);

    tareasPorFecha[fecha]
      .sort((a, b) => a.hora.localeCompare(b.hora))
      .forEach(t => {
        const li = document.createElement("li");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = t.completado;
        checkbox.onchange = () => toggleCompletado(t.index);
        li.appendChild(checkbox);

        const span = document.createElement("span");
        span.innerHTML = `<strong>${t.texto}</strong> (${t.hora})`;
        if (t.completado) span.style.textDecoration = "line-through";
        li.appendChild(span);

        const detalles = document.createElement("small");
        detalles.innerHTML = `Categoría: ${t.categoria} | Prioridad: ${t.prioridad}`;
        li.appendChild(detalles);

        const btnEditar = document.createElement("button");
        btnEditar.textContent = "✏️";
        btnEditar.classList.add("btn-editar");
        btnEditar.onclick = () => editarTarea(t.index);
        li.appendChild(btnEditar);

        const btnEliminar = document.createElement("button");
        btnEliminar.textContent = "❌";
        btnEliminar.classList.add("btn-eliminar");
        btnEliminar.onclick = () => eliminarTarea(t.index);
        li.appendChild(btnEliminar);

        DOM.lista.appendChild(li);
      });
  });

  const pendientes = tareasFiltradas.filter(t => !t.completado).length;
  actualizarDashboard({ ...datosDashboard, tareas: `${pendientes} pendientes` });
  mostrarCalendario();
}

// ====================================================
// FUNCIONES DE NOTIFICACIONES
// ====================================================
function pedirPermisoNotificaciones() {
  if ("Notification" in window) Notification.requestPermission();
}

function mostrarNotificacionVisual(mensaje) {
  DOM.notificacion.innerHTML = `
    <div class="notificacion-popup">
      <p>${mensaje}</p>
      <button id="posponer-btn">Posponer 5 minutos</button>
      <button id="cerrar-btn">Cerrar</button>
    </div>
  `;
  DOM.notificacion.style.display = "block";
  sonidoAlerta.play();

  document.getElementById("posponer-btn").onclick = () => {
    DOM.notificacion.style.display = "none";
    setTimeout(revisarRecordatorios, 5 * 60 * 1000);
  };

  document.getElementById("cerrar-btn").onclick = () => {
    DOM.notificacion.style.display = "none";
  };
}

function mostrarNotificacionNavegador(titulo, cuerpo) {
  if (Notification.permission === "granted") {
    new Notification(titulo, {
      body: cuerpo,
      icon: "ruta/a/icono.png",
      requireInteraction: true
    });
  }
}

function revisarRecordatorios() {
  const ahora = new Date();
  tareasGuardadas.forEach(t => {
    if (!t.completado) {
      const fechaTarea = new Date(`${t.fecha}T${t.hora}:00`);
      const tiempoFaltante = fechaTarea - ahora;
      if (tiempoFaltante > 0 && tiempoFaltante <= 5 * 60 * 1000) {
        const mensaje = `Tarea: ${t.texto} a las ${t.hora}`;
        mostrarNotificacionNavegador("Recordatorio", mensaje);
        mostrarNotificacionVisual(mensaje);
      }
    }
  });
}

// ====================================================
// FUNCIONES DE ESTADÍSTICAS
// ====================================================
function guardarEstadisticas() {
  const total = tareasGuardadas.length;
  const completadas = tareasGuardadas.filter(t => t.completado).length;
  localStorage.setItem("estadisticas", JSON.stringify({
    total,
    completadas,
    fecha: new Date().toISOString()
  }));
}

function mostrarEstadisticas() {
  const stats = JSON.parse(localStorage.getItem("estadisticas"));
  if (!stats || !DOM.stats) return;

  DOM.stats.innerHTML = `
    <p>Total tareas: ${stats.total}</p>
    <p>Tareas completadas: ${stats.completadas}</p>
    <p>Última actualización: ${new Date(stats.fecha).toLocaleString()}</p>
  `;
}

function obtenerDatosProgreso() {
  const hoy = new Date();
  const semanas = [];

  for (let i = 3; i >= 0; i--) {
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - hoy.getDay() - i * 7);
    semanas.push({ inicio, completadas: 0 });
  }

  tareasGuardadas.forEach(t => {
    if (t.completado) {
      const fecha = new Date(t.fecha);
      semanas.forEach(s => {
        if (fecha >= s.inicio && fecha < new Date(s.inicio.getTime() + 7 * 24 * 60 * 60 * 1000)) {
          s.completadas++;
        }
      });
    }
  });

  return semanas.map(s => ({ semana: s.inicio.toLocaleDateString(), completadas: s.completadas }));
}

function actualizarSeguimiento() {
  if (!DOM.ctxGrafica) return;

  const datos = obtenerDatosProgreso();
  const etiquetas = datos.map(d => d.semana);
  const completadas = datos.map(d => d.completadas);

  if (window.graficaProgreso) {
    window.graficaProgreso.data.labels = etiquetas;
    window.graficaProgreso.data.datasets[0].data = completadas;
    window.graficaProgreso.update();
  } else {
    window.graficaProgreso = new Chart(DOM.ctxGrafica, {
      type: 'line',
      data: {
        labels: etiquetas,
        datasets: [{
          label: 'Tareas Completadas',
          data: completadas,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true
      }
    });
  }
}

// ====================================================
// FUNCIONES POMODORO
// ====================================================
function actualizarDisplay() {
  const minutos = Math.floor(tiempoRestante / 60);
  const segundos = tiempoRestante % 60;
  DOM.tiempoEl.textContent = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
}

function mostrarNotificacion(mensaje) {
  DOM.notificacionVisual.textContent = mensaje;
}

function iniciarTemporizador() {
  if (temporizadorID) return; // Evita múltiples intervalos
  mostrarNotificacion(enTrabajo ? "Trabajando..." : "Descansando...");

  temporizadorID = setInterval(() => {
    tiempoRestante--;
    actualizarDisplay();

    if (tiempoRestante <= 0) {
      sonidoAlerta.play();
      clearInterval(temporizadorID);
      temporizadorID = null;

      if (enTrabajo) {
        sesionesCompletadas++;
        DOM.sesionesCompletadasEl.textContent = sesionesCompletadas;
      }

      enTrabajo = !enTrabajo;
      tiempoRestante = enTrabajo
        ? parseInt(DOM.inputTiempoTrabajo.value) * 60
        : parseInt(DOM.inputTiempoDescanso.value) * 60;

      mostrarNotificacion(enTrabajo ? "Trabajando..." : "Descansando...");
      iniciarTemporizador();
    }
  }, 1000);
}

function pausarTemporizador() {
  if (temporizadorID) {
    clearInterval(temporizadorID);
    temporizadorID = null;
    mostrarNotificacion("Pausado");
  }
}

function reiniciarTemporizador() {
  pausarTemporizador();
  enTrabajo = true;
  tiempoRestante = parseInt(DOM.inputTiempoTrabajo.value) * 60;
  actualizarDisplay();
  mostrarNotificacion("Listo para concentrarte");
  sesionesCompletadas = 0;
  DOM.sesionesCompletadasEl.textContent = sesionesCompletadas;
}

// ====================================================
// EVENTOS Y ARRANQUE
// ====================================================
document.addEventListener("DOMContentLoaded", () => {
  actualizarDashboard(datosDashboard);
  mostrarTareas("todos");
  mostrarEstadisticas();
  actualizarSeguimiento();
  pedirPermisoNotificaciones();

  tiempoRestante = parseInt(DOM.inputTiempoTrabajo.value) * 60 || 25 * 60;
  actualizarDisplay();
  mostrarNotificacion("Listo para concentrarte");

  DOM.btnIniciarPomodoro.disabled = false;
  DOM.btnPausarPomodoro.disabled = true;

  // Eventos botones pomodoro
  DOM.btnIniciarPomodoro.addEventListener("click", () => {
    iniciarTemporizador();
    DOM.btnIniciarPomodoro.disabled = true;
    DOM.btnPausarPomodoro.disabled = false;
  });

  DOM.btnPausarPomodoro.addEventListener("click", () => {
    pausarTemporizador();
    DOM.btnIniciarPomodoro.disabled = false;
    DOM.btnPausarPomodoro.disabled = true;
  });

  DOM.btnReiniciarConfig.addEventListener("click", reiniciarTemporizador);

  // Filtrar tareas por día
  if (DOM.filtroDia) {
    DOM.filtroDia.onchange = () => mostrarTareas(DOM.filtroDia.value);
  }

  // Revisar recordatorios cada minuto
  setInterval(revisarRecordatorios, 60 * 1000);
  });