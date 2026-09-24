/**
 * contact router
 *
 * Ruta publica y sin contenido asociado: no hay coleccion "contact" en el
 * gestor, solo un endpoint que recibe el formulario de la landing y envia
 * el correo. Al declarar auth: false queda accesible sin token y sin
 * depender de los permisos del rol publico.
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/contact',
      handler: 'contact.send',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
