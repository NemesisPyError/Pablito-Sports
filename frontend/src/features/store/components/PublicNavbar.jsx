import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { MediaTile } from '../../../shared/components/MediaTile.jsx';
import { useCart } from '../../cart/index.js';
import { useBrands } from '../../catalog/hooks/useBrands.js';
import { useCategories } from '../../catalog/hooks/useCategories.js';
import { buildNavAxes } from '../utils/navAxes.js';
import { MegaMenu } from './MegaMenu.jsx';
import styles from './PublicNavbar.module.css';

/** v1.4.0: un eje despliega panel si tiene categorías o marcas para mostrar. */
function hasPanel(axis) {
  return axis.groups.length > 0 || (axis.brands?.length ?? 0) > 0;
}

/** §8: glifos del sistema como SVG en línea, mientras no exista biblioteca. */
function Icon({ name }) {
  const paths = {
    menu: 'M4 7h16M4 12h16M4 17h16',
    close: 'M6 6l12 12M18 6L6 18',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
    cart: 'M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.55L20.5 8H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  };

  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}

/** Campo de búsqueda que navega al enviar. */
function SearchForm({ className, autoFocus = false, onSubmitted }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = term.trim();
    if (!value) return;

    navigate(`/catalogo?q=${encodeURIComponent(value)}`);
    onSubmitted?.();
  };

  return (
    <form className={className} role="search" onSubmit={handleSubmit}>
      <input
        type="search"
        className={styles.searchField}
        placeholder="¿Qué buscás?"
        aria-label="Buscar productos"
        value={term}
        // El foco automático solo ocurre cuando el usuario abrió la búsqueda a
        // propósito desde el botón: es la continuación de su acción, no una
        // captura de foco al cargar la página.
        autoFocus={autoFocus}
        onChange={(event) => setTerm(event.target.value)}
      />
    </form>
  );
}

/**
 * Navegación superior del catálogo (09_COMPONENTES.md §9.8 `PublicNavbar`).
 *
 * `COMPP-06`: los ejes de sexo se combinan con las categorías reales; no se
 * crean categorías por sexo. «Nosotros» y «Contacto» no viven acá, viven en
 * el pie.
 */
export function PublicNavbar({ storeSettings }) {
  const cart = useCart();
  const categoriesQuery = useCategories();
  const brandsQuery = useBrands();
  const axes = buildNavAxes(categoriesQuery.data ?? [], brandsQuery.data ?? []);

  const [openAxis, setOpenAxis] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerAxis, setDrawerAxis] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const axisRefs = useRef({});
  const drawerRef = useRef(null);
  const menuButtonRef = useRef(null);
  const closeTimer = useRef(null);

  const closeAxis = (returnFocus = false) => {
    if (returnFocus && openAxis) axisRefs.current[openAxis]?.focus();
    setOpenAxis(null);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerAxis(null);
    menuButtonRef.current?.focus();
  };

  // El cajón es un diálogo (§10.4): captura el foco y se cierra con Escape.
  useEffect(() => {
    if (!drawerOpen) return undefined;

    const drawer = drawerRef.current;
    drawer?.querySelector('button, a')?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeDrawer();
        return;
      }
      if (event.key !== 'Tab' || !drawer) return;

      const focusables = drawer.querySelectorAll('a[href], button:not([disabled])');
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const handleAxisKeyDown = (event) => {
    if (event.key === 'Escape') closeAxis(true);
  };

  return (
    <header
      className={styles.header}
      onKeyDown={handleAxisKeyDown}
      onMouseLeave={() => {
        closeTimer.current = setTimeout(() => setOpenAxis(null), 100);
      }}
      onMouseEnter={() => clearTimeout(closeTimer.current)}
    >
      <a href="#contenido" className={styles.skip}>
        Saltar al contenido
      </a>

      <div className={styles.bar}>
        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={drawerOpen}
        >
          <Icon name="menu" />
        </button>

        <Link to="/" className={styles.brand}>
          {storeSettings?.store_name ?? 'Pablito Sports'}
        </Link>

        <nav className={styles.axes} aria-label="Principal">
          {axes.map((axis) =>
            hasPanel(axis) ? (
              <button
                key={axis.key}
                ref={(node) => {
                  axisRefs.current[axis.key] = node;
                }}
                type="button"
                className={`${styles.axis} ${openAxis === axis.key ? styles.axisOpen : ''}`}
                aria-expanded={openAxis === axis.key}
                aria-controls={`mega-${axis.key}`}
                onClick={() => setOpenAxis(openAxis === axis.key ? null : axis.key)}
                onMouseEnter={() => setOpenAxis(axis.key)}
              >
                {axis.label}
              </button>
            ) : (
              <Link
                key={axis.key}
                to={axis.href}
                className={`${styles.axis} ${axis.accent ? styles.axisAccent : ''}`}
                onMouseEnter={() => setOpenAxis(null)}
              >
                {axis.label}
              </Link>
            ),
          )}
        </nav>

        <div className={styles.actions}>
          <SearchForm className={styles.search} />

          <button
            type="button"
            className={styles.searchToggle}
            onClick={() => setSearchOpen((open) => !open)}
            aria-label="Buscar"
            aria-expanded={searchOpen}
          >
            <Icon name={searchOpen ? 'close' : 'search'} />
          </button>

          <Link to="/carrito" className={styles.cart} aria-label="Ver carrito">
            <Icon name="cart" />
            {cart.count > 0 && (
              <span className={styles.cartCount}>
                {cart.count}
                <span className="visually-hidden"> productos en el carrito</span>
              </span>
            )}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <SearchForm
          className={styles.searchMobile}
          autoFocus
          onSubmitted={() => setSearchOpen(false)}
        />
      )}

      {openAxis && (
        <MegaMenu
          axis={axes.find((axis) => axis.key === openAxis)}
          id={`mega-${openAxis}`}
          onNavigate={() => closeAxis()}
        />
      )}

      {drawerOpen && (
        <>
          <div
            className={styles.overlay}
            onClick={closeDrawer}
            role="presentation"
            aria-hidden="true"
          />

          <div
            ref={drawerRef}
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <div className={styles.drawerHead}>
              <p className={styles.drawerTitle}>Menú</p>
              <button
                type="button"
                className={styles.iconButton}
                onClick={closeDrawer}
                aria-label="Cerrar menú"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {axes.map((axis) =>
                hasPanel(axis) ? (
                  <div key={axis.key}>
                    <button
                      type="button"
                      className={styles.drawerAxis}
                      aria-expanded={drawerAxis === axis.key}
                      onClick={() => setDrawerAxis(drawerAxis === axis.key ? null : axis.key)}
                    >
                      {axis.label}
                      <span aria-hidden="true">{drawerAxis === axis.key ? '–' : '+'}</span>
                    </button>

                    {drawerAxis === axis.key && (
                      <div className={styles.drawerPanel}>
                        <Link
                          to={axis.href}
                          className={styles.drawerGroupTitle}
                          onClick={closeDrawer}
                        >
                          {`Ver todo ${axis.label}`}
                        </Link>

                        {axis.groups.map((group) => (
                          <div key={group.slug} className={styles.drawerGroup}>
                            <Link
                              to={group.href}
                              className={styles.drawerGroupTitle}
                              onClick={closeDrawer}
                            >
                              {group.name}
                            </Link>

                            {group.items.map((item) => (
                              <Link
                                key={item.slug}
                                to={item.href}
                                className={styles.drawerLink}
                                onClick={closeDrawer}
                              >
                                {item.name}
                              </Link>
                            ))}
                          </div>
                        ))}

                        {axis.brands?.length > 0 && (
                          <div className={styles.drawerGroup}>
                            <span className={styles.drawerGroupTitle}>Marcas</span>
                            <div className={styles.drawerBrands}>
                              {axis.brands.map((brand) => (
                                <MediaTile
                                  key={brand.slug}
                                  name={brand.name}
                                  href={brand.href}
                                  imageUrl={brand.imageUrl}
                                  aspect="brand"
                                  className={styles.drawerBrandTile}
                                  onClick={closeDrawer}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={axis.key}
                    to={axis.href}
                    className={`${styles.drawerAxis} ${axis.accent ? styles.drawerAxisAccent : ''}`}
                    onClick={closeDrawer}
                  >
                    {axis.label}
                  </Link>
                ),
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
