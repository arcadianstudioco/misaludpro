import React, { useEffect, useState } from 'react';
import { FileCheck2, HeartPulse, Shield, X } from 'lucide-react';

export type LegalDocTab = 'terms' | 'privacy' | 'health';

interface LegalDocumentsModalProps {
  initialTab: LegalDocTab;
  onClose: () => void;
  onAcceptAll?: () => void;
}

export function LegalDocumentsModal({
  initialTab,
  onClose,
  onAcceptAll,
}: LegalDocumentsModalProps) {
  const [activeTab, setActiveTab] = useState<LegalDocTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2.5"
      role="dialog"
      aria-modal="true"
      aria-label="Información legal y de privacidad"
    >
      <div className="w-full max-w-[380px] rounded-3xl bg-[#141C17] border border-white/10 p-4 space-y-3.5 max-h-[86vh] flex flex-col">
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-white truncate">
              Información Legal y Privacidad
            </h3>
            <p className="text-[11px] text-[#9AA89E]">
              Mi Salud Pro · Última actualización: 2026
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar documento legal"
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#9AA89E] hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Switchable Document Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#0D120F] border border-white/8 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`min-h-[34px] px-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-[#74D834] text-[#081007]'
                : 'text-[#9AA89E] hover:text-white'
            }`}
          >
            <FileCheck2 className="w-3 h-3 shrink-0" />
            <span className="truncate">Términos</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`min-h-[34px] px-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-[#74D834] text-[#081007]'
                : 'text-[#9AA89E] hover:text-white'
            }`}
          >
            <Shield className="w-3 h-3 shrink-0" />
            <span className="truncate">Privacidad</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`min-h-[34px] px-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'health'
                ? 'bg-[#74D834] text-[#081007]'
                : 'text-[#9AA89E] hover:text-white'
            }`}
          >
            <HeartPulse className="w-3 h-3 shrink-0" />
            <span className="truncate">Aviso Médico</span>
          </button>
        </div>

        {/* Scrollable Legal Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 text-xs text-[#C5D0C8] leading-relaxed">
          {activeTab === 'terms' && (
            <>
              <section className="space-y-1">
                <h4 className="font-display font-bold text-white text-[13px]">
                  1. Aceptación de los Términos de Uso
                </h4>
                <p>
                  Al crear una cuenta, iniciar sesión con correo electrónico, Google o Apple, o
                  utilizar cualquier herramienta de seguimiento de <strong>Mi Salud Pro</strong>,
                  aceptas cumplir estos Términos y Condiciones. Si no estás de acuerdo, debes
                  abstenerte de utilizar el servicio.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-display font-bold text-white text-[13px]">
                  2. Cuenta, Seguridad y Acceso
                </h4>
                <p>
                  Eres responsable de mantener la confidencialidad de tus credenciales de acceso.
                  Las contraseñas locales se almacenan exclusivamente mediante derivados criptográficos
                  seguros (scrypt con sal aleatoria por usuario) y nunca en texto plano. Puedes
                  solicitar el cierre de sesión o la eliminación definitiva de tu cuenta en cualquier
                  momento desde el apartado <em>Perfil</em>.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-display font-bold text-white text-[13px]">
                  3. Uso Permitido y Exportación de Planes
                </h4>
                <p>
                  Las rutinas, cálculos nutricionales, historial de progreso y archivos PDF o JSON
                  generados en Mi Salud Pro son para uso personal y privado. Queda prohibida la
                  reventa automatizada, ingeniería inversa abusiva o alteración maliciosa del
                  servicio.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-display font-bold text-white text-[13px]">
                  4. Disponibilidad y Modificaciones
                </h4>
                <p>
                  Podemos actualizar fórmulas de estimación física, catálogos de alimentos o estos
                  términos para mejorar la experiencia y el cumplimiento normativo. El uso continuo
                  tras cualquier actualización implica la aceptación de la versión vigente.
                </p>
              </section>
            </>
          )}

          {activeTab === 'privacy' && (
            <>
              <section className="space-y-1">
                <h4 className="font-display font-bold text-white text-[13px]">
                  1. Datos que Recopilamos
                </h4>
                <p>
                  Para brindarte métricas personalizadas almacenamos únicamente los datos que tú
                  proporcionas: nombre, correo electrónico, edad, estatura, peso, medidas
                  corporales, hábitos diarios, registros de comidas, sesiones deportivas y notas
                  personales. Si usas GPS en carreras o caminatas, las coordenadas permanecen en tu
                  historial de sesión sin compartirse con terceros publicitarios.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-display font-bold text-white text-[13px]">
                  2. Inicio de Sesión con Google o Apple y Cookies de Sesión
                </h4>
                <p>
                  Cuando eliges continuar con Google o Apple solo solicitamos tu identificador,
                  nombre y correo electrónico para crear o vincular tu perfil. Si activas la opción{' '}
                  <strong>&ldquo;Guardar contraseña&rdquo;</strong>, el servidor emite una cookie de
                  sesión cifrada y protegida (<code>HttpOnly</code>, <code>Secure</code>,{' '}
                  <code>SameSite=None</code>) para mantener tu sesión abierta hasta 30 días, y el
                  navegador puede guardar tu credencial en su gestor nativo de contraseñas. Nunca
                  guardamos contraseñas ni tokens en <code>localStorage</code>.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-display font-bold text-white text-[13px]">
                  3. No Venta de Datos y Tus Derechos
                </h4>
                <p>
                  Mi Salud Pro <strong>no vende ni alquila</strong> tu información biométrica o de
                  salud a anunciantes ni corredores de datos. Puedes descargar una copia íntegra en
                  formato JSON o PDF, editar tus datos o borrar por completo tu cuenta y todo su
                  historial desde la pestaña <em>Perfil</em>.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-display font-bold text-white text-[13px]">
                  4. Seguridad Técnica
                </h4>
                <p>
                  Todas las sesiones utilizan firmas HMAC-SHA256 verificadas con comparación de
                  tiempo constante y protección contra solicitudes entre sitios (CSRF) en las
                  operaciones autenticadas.
                </p>
              </section>
            </>
          )}

          {activeTab === 'health' && (
            <>
              <section className="space-y-1">
                <h4 className="font-display font-bold text-white text-[13px]">
                  1. Naturaleza Informativa y Deportiva
                </h4>
                <p>
                  Mi Salud Pro es una herramienta de bienestar general, entrenamiento físico y
                  seguimiento nutricional. <strong>No constituye diagnóstico médico</strong>,
                  prescripción clínica ni sustituye la valoración presencial de un médico,
                  nutricionista o fisioterapeuta certificado.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-display font-bold text-white text-[13px]">
                  2. Estimaciones Biométricas
                </h4>
                <p>
                  El Índice de Masa Corporal (IMC), el porcentaje de grasa estimado, el gasto
                  calórico y las metas de macronutrientes se calculan mediante ecuaciones estándar de
                  población general y deben interpretarse como guías orientativas.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-display font-bold text-white text-[13px]">
                  3. Prevención de Lesiones
                </h4>
                <p>
                  Antes de iniciar rutinas intensas, carrera al aire libre o ejercicios de suelo
                  pélvico tras una cirugía o lesión previa, consulta a tu profesional de la salud y
                  detén inmediatamente cualquier movimiento que provoque dolor agudo, mareo o falta
                  de aire.
                </p>
              </section>
            </>
          )}
        </div>

        <div className="flex gap-2 pt-1 shrink-0">
          {onAcceptAll ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[42px] rounded-2xl bg-[#1A231D] text-xs font-semibold text-[#D2DDD5] cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  onAcceptAll();
                  onClose();
                }}
                className="flex-1 min-h-[42px] rounded-2xl bg-gradient-to-r from-[#82E63E] to-[#58C222] text-xs font-display font-semibold text-[#081007] cursor-pointer"
              >
                Aceptar y continuar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[42px] rounded-2xl bg-gradient-to-r from-[#82E63E] to-[#58C222] text-xs font-display font-semibold text-[#081007] cursor-pointer"
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
