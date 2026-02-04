export const SELECTORS = {
  // URL fija (no depende del CSV)
  loginUrl: "https://nueva.afpmodelo.cl/portalprivado/user/login#/",
  successUrl: "https://nueva.afpmodelo.cl/portalprivado/inicio",

  // Inputs y botón según lo solicitado (locators “semánticos”)
  rutTextboxRoleName: { role: "textbox", name: "* RUT:" },
  claveTextboxRoleName: { role: "textbox", name: "* Clave web:" },
  loginButtonRoleName: { role: "button", name: "Iniciar sesión" },

  // Señales
  successTextResumen: "Resumen",
  invalidDataText: "Algunos de los datos no son válidos",

  // Logout
  avatarTriggerCss: ".antd-pro-global-header-index-avatar",
  confirmLogoutButtonRoleName: { role: "button", name: "Cerrar sesión" },
  confirmLogoutTextPartial: "¿Estás seguro que quieres cerrar tu sesión?"
} as const;
