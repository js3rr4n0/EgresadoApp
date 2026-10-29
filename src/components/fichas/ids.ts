// Identificadores para espacios, etapas e hitos nuevos. Solo deben ser únicos dentro de la ficha.
export function nuevoId(prefijo: string) {
  return `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
