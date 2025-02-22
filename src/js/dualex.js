/**
  Controlador principal de la aplicación.
**/

// Modelos
import { Modelo } from './modelos/modelo.js'

// Vistas
import { VistaLogin } from './vistas/vistalogin.js'
import { VistaDialogo } from './vistas/vistadialogo.js'
import { VistaMensaje } from './vistas/vistamensaje.js'
import { VistaMenu } from './vistas/vistamenu.js'

// Vista de tareas del alumno
import { VistaTareas } from './vistas/vistatareas.js'
// Detalle de Tarea
import { VistaTarea } from './vistas/vistatarea.js'
// Listado de Alumnos
import { VistaAlumnos } from './vistas/vistaalumnos.js'
// Informe de Alumno
import { VistaInforme } from './vistas/vistainforme.js'
// Créditos
import { VistaCreditos } from './vistas/vistacreditos.js'

// Servicios
import { Rest } from './servicios/rest.js'

/**
  Controlador principal de la aplicación.
**/
class DualEx {
  #usuario = null // Usuario logeado.

  constructor () {
    window.onload = this.iniciar.bind(this)
    window.onerror = function (error) { console.log('Error capturado. ' + error) }
  }

  /**
    Inicia la aplicación cargando la vista de login.
    Se llama al cargar la página.
  **/
  iniciar () {
    this.modelo = new Modelo()
    this.alumno = null
    this.vistaLogin = new VistaLogin(this, document.getElementById('divLogin'))
    this.vistaDialogo = new VistaDialogo(this, document.getElementById('divDialogo'))
    this.vistaMensaje = new VistaMensaje(this, document.getElementById('divMensaje'))
    this.vistaMenu = new VistaMenu(this, document.getElementById('divMenu'))
    this.vistaAlumnos = new VistaAlumnos(this, document.getElementById('divAlumnos'))
    this.vistaTarea = new VistaTarea(this, document.getElementById('divTarea'))
    this.vistaTareas = new VistaTareas(this, document.getElementById('divTareas'))
    this.vistaInforme = new VistaInforme(this, document.getElementById('divInforme'))
    this.vistaCreditos = new VistaCreditos(this, document.getElementById('divCreditos'))
    this.vistaLogin.mostrar()
  }

  /**
    Muestra el error en la vista de mensajes.
    @param error {Error} Error que se ha producido.
  **/
  gestionarError (error) {
    this.vistaMensaje.mostrar(error)
    console.error(error)
  }

  /**
    Recibe el token del login con Google y lo envía al servidor para identificar al usuario.
    @param token {Object} Token de identificación de usuario de Google.
  **/
  login (token) {
    Rest.post('login', [], token.credential, true)
      .then(usuario => {
        this.#usuario = usuario
        Rest.setAutorizacion(this.#usuario.autorizacion)
        this.vistaMenu.mostrar(true)
        this.vistaLogin.mostrar(false)
        switch (usuario.rol) {
          case 'alumno':
            this.mostrarTareasAlumno(this.#usuario)
            break
          case 'profesor':
            this.mostrarAlumnos()
            break
          default:
            console.error(`Rol de usuario desconocido: ${usuario.rol}`)
        }
      })
      .catch(e => { this.vistaLogin.mostrarError(e) })
  }

  /**
    Cierra la sesión del usuario.
  **/
  logout () {
    this.#usuario = null
    Rest.setAutorizacion(null)
    this.ocultarVistas()
    this.vistaMenu.mostrar(false)
    this.vistaLogin.mostrar(true)
  }

  /**
    Devuelve el usuario logeado.
    @return {Usuario} Devuelve el usuario logeado.
  **/
  getUsuario () {
    return this.#usuario
  }

  /**
    Oculta todas las vistas.
  **/
  ocultarVistas () {
    this.vistaTarea.mostrar(false)
    this.vistaTareas.mostrar(false)
    this.vistaAlumnos.mostrar(false)
    this.vistaInforme.mostrar(false)
    this.vistaCreditos.mostrar(false)
  }

  /**
    Muestra la vista de tareas del alumno.
    @param alumno {Alumno} Datos del alumno.
  **/
  mostrarTareasAlumno (alumno) {
    this.alumno = alumno
    // Para saber volver cuando sea el profesor
    if (this.#usuario.rol === 'profesor') {
      if (!alumno) {
        alumno = this.alumnoMostrado 
        this.alumno = this.alumnoMostrado
      } 
      else {
        this.alumnoMostrado = alumno
      }
    }
   
    //if (alumno == null) { alumno = this.#usuario }
		alumno = this.alumno ?? this.#usuario 
    this.ocultarVistas()
    this.modelo.getTareasAlumno(alumno)
      .then(tareas => {
        this.vistaMenu.verTareasAlumno(alumno)
				this.tareas = tareas
        this.vistaTareas.cargar(tareas)
        this.ocultarVistas()
        this.vistaTareas.mostrar(true)
      })
      .catch(error => this.gestionarError(error))
  }

  /**
    Muestra la vista del informe de un alumno.
    @param alumno {Alumno} Datos del alumno.
    @param periodo {Number} Número del periodo del que se solicita el informe
  **/
  mostrarInformeAlumno (alumno, periodo) {
    this.alumno = alumno
    if (this.#usuario.rol !== 'profesor') return
    this.ocultarVistas()
    this.modelo.getInformeAlumno(alumno, periodo)
      .then(informe => {
        this.vistaMenu.verInforme(alumno)
        this.vistaInforme.cargar(alumno, informe)
        this.ocultarVistas()
        this.vistaInforme.mostrar(true)
      })
      .catch(error => this.gestionarError(error))
  }

  /**
    Muestra la vista de alumnos del profesor.
    @param borrar {Boolean} Indica si hay que borrar la lista de alumnos anterior.
  **/
  mostrarAlumnos (borrar = true) {
    if (this.#usuario.rol !== 'profesor') { throw Error('Operación no permitida.') }
    this.modelo.getAlumnosProfesor()
      .then(alumnos => {
        this.vistaMenu.verAlumnosProfesor()
        if (borrar)
            this.vistaAlumnos.cargar(alumnos)
        this.ocultarVistas()
        this.vistaAlumnos.mostrar(true)
      })
      .catch(error => this.gestionarError(error))
  }

  /**
    Muestra la vista de tarea.
    @param tarea {Tarea} Datos de la tarea. Si es nula se mostrará la vista vacía para crear una nueva Tarea.
  **/
  mostrarTarea (tarea) {
    if (tarea) {
      this.modelo.getTarea(tarea.id)
        .then(tareas => {
          this.vistaMenu.verTarea(tareas[0])
          this.ocultarVistas()
          this.vistaTarea.mostrar(true, tareas[0])
        })
    } else {
      this.vistaMenu.verTarea(null)
      this.ocultarVistas()
      this.vistaTarea.mostrar(true)
    }
  }

  /**
    Devuelve la lista de actividades definidas.
    @param idCurso {Number} Identificador del curso.
    @return {Promise} Promesa de resolución de la petición.
  **/
  verActividades (idCurso) {
    return this.modelo.getActividades(idCurso)
  }

  /**
    Devuelve la lista de calificaciones definidas.
    @return {Promise} Promesa de resolución de la petición.
  **/
  verCalificaciones () {
    return this.modelo.getCalificaciones()
  }

  /**
    Crea una nueva tarea y vuelve a la vista de tareas del alumno.
    @param tarea {Tarea} Datos de la nueva tarea.
  **/
  crearTarea (tarea) {
    this.modelo.crearTarea(tarea)
      .then(resultado => {
        this.vistaMensaje.mostrar('La tarea se creó correctamente', VistaMensaje.OK)
        this.mostrarTareasAlumno(this.#usuario)
      })
      .catch(error => this.gestionarError(error))
  }

  /**
    Modifica una tarea y vuelve a la vista de tareas del alumno.
    @param tarea {Tarea} Datos de la tarea.
		@param siguienteTarea {Tarea} Datos de la siguiente tarea a mostrar.
  **/
  modificarTarea (tarea, siguienteTarea = null) {
    this.modelo.modificarTarea(tarea)
      .then(resultado => {
        if(!siguienteTarea){
          this.vistaMensaje.mostrar('La tarea se modificó correctamente', VistaMensaje.OK)
          if (this.#usuario.rol === 'profesor') {
            this.mostrarTareasAlumno(this.alumnoMostrado) 
          } 
          else {
            this.mostrarTareasAlumno(this.#usuario) 
          }
        }
				else
					this.mostrarTarea(siguienteTarea)
      })
      .catch(error => this.gestionarError(error))
  }

  /**
    Elimina una tarea.
    @param tarea {Tarea} Datos de la tarea.
  **/
  eliminarTarea (tarea) {
    const titulo = `¿Realmente quiere ELIMINAR la tarea  "${tarea.titulo}"?`
    const mensaje = 'Esta operación no puede deshacerse.'
    this.vistaDialogo.abrir(titulo, mensaje, confirmar => {
      if (confirmar) {
        this.modelo.borrarTarea(tarea)
          .then(respuesta => {
            this.vistaMensaje.mostrar('La tarea se eliminó correctamente.', VistaMensaje.OK)
            this.mostrarTareasAlumno(this.#usuario)
          })
          .catch(error => this.gestionarError(error))
      } else { this.vistaDialogo.cerrar() }
    })
  }

  /**
    Imprime la vista actual.
  **/
  imprimir () {
    this.vistaInforme.combinar()
    window.print()
  }

  /**
    Devuelve una promesa que devolverá la lista de periodos con su identificador y su título.
    @return {Promise} Promesa de resolución de la petición.
  **/
  verPeriodos () {
    return this.modelo.getPeriodos()
  }

  /**
    Muestra la vista de créditos de la aplicación.
  **/
  verCreditos () {
    this.vistaMenu.verCreditos()
    this.ocultarVistas()
    this.vistaCreditos.mostrar(true)
  }

  /**
   * Develve la lista de cursos existentes
   * @returns array
   */
  getCursos(){
    return this.modelo.getCursos()
  }

  /**
   * Develve la lista de alumnos de un profesor
   * @returns array
   */
  getAlumnosProfesor(){
    return this.modelo.getAlumnosProfesor()
  }

  /**
   * Develve la lista actividades de un alumno y su nota media
   * @param id id del alumno del que queremos ver el informe.
   * @param periodo periodo del que queremos ver el informe.
   * @returns array
   */
  traerActividadNotas(id,periodo){
    return this.modelo.getActividadNotas(id,periodo)
  }

  /**
   * Develve la lista módulos de un alumno y su nota media
   * @param id id del alumno del que queremos ver el informe.
   * @param periodo periodo del que queremos ver el informe.
   * @returns array
   */
  traerModulosNotas(id,periodo){
    return this.modelo.getModulosNotas(id,periodo)
  }

  /**
   * Develve la lista de tareas de un alumno
   * @returns array
   */
  getTareas(){
		//let alumno = this.alumno ?? this.#usuario 
    //return this.modelo.getTareasAlumno(alumno)
		return this.tareas
  }

  /**
   * Cambia el nombre del título de la tarea en la barra superior/menú
   * @param tarea tarea de la que queremos poner el título
   */
  cargarNombreTarea(tarea){
    console.log(tarea.titulo)
    this.vistaMenu.verTarea(tarea)
  }
  
}

/* eslint-disable no-new */
new DualEx()
