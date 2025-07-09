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
};

const sonidoAlerta = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');

// ====================================================
// DASHBOARD Y UI PRINCIPAL
// ====================================================
function actualizarDashboard(data) {
  document.querySelector("#tareas .card-content").textContent = data.tareas;
  document.querySelector("#eventos .card-content").textContent = data.eventos;
  document.querySelector("#progreso .card-content").textContent = data.progreso;
  document.querySelector("#rutina .card-content").textContent = data.rutina;
}

// ====================================================
// GESTIÓN DE TAREAS
// ====================================================
function guardarCambios() {
  localStorage.setItem("tareas", JSON.stringify(tareasGuardadas));
  guardarEstadisticas();
  mostrarTareas(DOM.filtroDia.value);
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
// MOSTRAR TAREAS Y CALENDARIO
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

  let tareasFiltradas = diaFiltro === "todos"
    ? [...tareasGuardadas]
    : tareasGuardadas.filter(t => new Date(t.fecha).getDay() === Number(diaFiltro));

  if (tareasFiltradas.length === 0) {
    DOM.lista.innerHTML = "<p>No hay tareas para este día.</p>";
    actualizarDashboard({ ...datosDashboard, tareas: "0 pendientes" });
    mostrarCalendario();
    return;
  }

  const tareasPorFecha = {};
  tareasFiltradas.forEach((t, i) => {
    if (!tareasPorFecha[t.fecha]) tareasPorFecha[t.fecha] = [];
    tareasPorFecha[t.fecha].push({ ...t, index: i });
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
// NOTIFICACIONES
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
// ESTADÍSTICAS Y PROGRESO
// ====================================================
function guardarEstadisticas() {
  const total = tareasGuardadas.length;
  const completadas = tareasGuardadas.filter(t => t.completado).length;
  localStorage.setItem("estadisticas", JSON.stringify({
    total, completadas, fecha: new Date().toISOString()
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
        const fin = new Date(s.inicio.getTime() + 6 * 86400000);
        if (fecha >= s.inicio && fecha <= fin) s.completadas++;
      });
    }
  });

  return semanas;
}

function crearGraficaProgreso() {
  if (!DOM.ctxGrafica) return;
  const datos = obtenerDatosProgreso();
  const etiquetas = datos.map(s => `${s.inicio.toLocaleDateString()} - ${new Date(s.inicio.getTime() + 6 * 86400000).toLocaleDateString()}`);
  const valores = datos.map(s => s.completadas);

  if (window.graficaProgreso) {
    window.graficaProgreso.data.labels = etiquetas;
    window.graficaProgreso.data.datasets[0].data = valores;
    window.graficaProgreso.update();
  } else {
    window.graficaProgreso = new Chart(DOM.ctxGrafica, {
      type: "bar",
      data: {
        labels: etiquetas,
        datasets: [{
          label: "Tareas Completadas",
          data: valores,
          backgroundColor: "rgba(75, 192, 192, 0.7)"
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, precision: 0 } }
      }
    });
  }
}

function mostrarEstadisticasDetalladas() {
  const mesActual = new Date().getMonth();
  const completadasMes = tareasGuardadas.filter(t =>
    t.completado && new Date(t.fecha).getMonth() === mesActual
  ).length;

  const horas = (completadasMes * 0.5).toFixed(1);

  document.getElementById("tareas-completadas-mes").textContent = `Tareas completadas este mes: ${completadasMes}`;
  document.getElementById("tiempo-invertido").textContent = `Tiempo invertido: ${horas} horas`;
  document.getElementById("constancia-meses").textContent = `Constancia: 1 mes consecutivo`;
}

function mostrarHistorial() {
  if (!DOM.historial) return;

  const tareasCompletadas = tareasGuardadas
    .filter(t => t.completado)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 10);

  DOM.historial.innerHTML = "";
  tareasCompletadas.forEach(t => {
    const li = document.createElement("li");
    li.textContent = `${t.texto} - ${t.fecha} ${t.hora}`;
    DOM.historial.appendChild(li);
  });
}

function actualizarSeguimiento() {
  crearGraficaProgreso();
  mostrarEstadisticasDetalladas();
  mostrarHistorial();
}

// ====================================================
// EVENTOS
// ====================================================
DOM.formTarea?.addEventListener("submit", e => {
  e.preventDefault();
  const texto = document.getElementById("input-tarea").value.trim();
  const fecha = document.getElementById("input-fecha").value;
  const hora = document.getElementById("input-hora").value;

  if (texto && fecha && hora) {
    tareasGuardadas.push({ texto, fecha, hora, completado: false });
    guardarCambios();
    DOM.formTarea.reset();
    mostrarNotificacionVisual("¡Tarea añadida correctamente!");
  }
});

DOM.filtroDia?.addEventListener("change", () => {
  mostrarTareas(DOM.filtroDia.value);
});

DOM.botonesSemana?.forEach(button => {
  button.addEventListener("click", () => {
    DOM.botonesSemana.forEach(btn => btn.setAttribute("aria-pressed", "false"));
    button.setAttribute("aria-pressed", "true");

    const dia = button.getAttribute("data-dia");
    dia === "todos" ? mostrarTareas() : mostrarTareas(parseInt(dia));
  });
});

// ====================================================
// INICIALIZACIÓN
// ====================================================
document.addEventListener("DOMContentLoaded", () => {
  actualizarDashboard(datosDashboard);
  mostrarTareas();
  mostrarEstadisticas();
  actualizarSeguimiento();
  pedirPermisoNotificaciones();

  DOM.botonesSemana?.forEach(button => {
    button.setAttribute("aria-pressed", button.getAttribute("data-dia") === "todos" ? "true" : "false");
  });
});

setInterval(revisarRecordatorios, 60000);
