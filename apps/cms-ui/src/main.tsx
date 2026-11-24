import { render } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import "./styles.css";
import { adminEndpoints, api, appConfig, ownerEndpoints } from "./api";
import { EditorProvider, useEditor } from "./editor";
import { Icon } from "./components/Icon";
import { SaveIndicator } from "./components/publish";
import { Loading, ToastHost } from "./components/ui";
import { AdminHosting, AdminNew, AdminShell, AdminTenant, AdminTenants } from "./pages/admin";
import { ChangePassword, Login, type Me } from "./pages/auth";
import { SectionPage, SiteHome, TemplatePage, TopBar } from "./pages/site";
import { go, match, useRoute } from "./router";

async function logout() {
  await api("POST", "/auth/logout").catch(() => {});
  window.location.hash = "/";
  window.location.reload();
}

/** Rute editor (dipakai pemilik di "/" dan admin di "/admin/t/:id/site"). */
function EditorRoutes({ path, base, homeHeader }: { path: string; base: string; homeHeader: preact.ComponentChildren }) {
  const rel = path.slice(base.length) || "/";
  const edit = match("/edit/:key", rel);
  if (edit) return <SectionPage sectionKey={edit.key!} />;
  if (rel === "/template") return <TemplatePage />;
  return <SiteHome header={homeHeader} />;
}

function OwnerHeader() {
  const ed = useEditor();
  return (
    <TopBar
      title={ed.content.business.name}
      right={
        <>
          <SaveIndicator />
          <a class="icon-btn" href="#/akun" aria-label="Akun">
            <Icon name="users" />
          </a>
        </>
      }
    />
  );
}

function AdminSiteHeader({ id }: { id: string }) {
  const ed = useEditor();
  return <TopBar title={`Isi situs ${ed.content.business.name}`} back={`/admin/t/${id}`} right={<SaveIndicator />} />;
}

function Account({ me }: { me: Me }) {
  return (
    <>
      <TopBar title="Akun" back="/" />
      <div class="layout">
        <div class="editor-col">
          <div class="ed-head">
            <h1>{me.user.username}</h1>
            <p>{me.tenant?.businessName}</p>
          </div>
          <div class="rows">
            <a class="row" href="#/akun/password">
              <span class="row-ico">
                <Icon name="eye" />
              </span>
              <span class="row-main">
                <span class="row-title">Ganti password</span>
              </span>
              <span class="row-chev">
                <Icon name="chevR" />
              </span>
            </a>
            <button class="row" onClick={logout}>
              <span class="row-ico" style="background:var(--cabai-soft);color:var(--cabai)">
                <Icon name="logout" />
              </span>
              <span class="row-main">
                <span class="row-title">Keluar</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  const path = useRoute();
  const [me, setMe] = useState<Me | null | undefined>(undefined);


  useEffect(() => {
    api<Me>("GET", "/auth/me")
      .then(setMe)
      .catch(() => setMe(null));
    api<{ siteUrlPattern: string }>("GET", "/config")
      .then((c) => (appConfig.siteUrlPattern = c.siteUrlPattern))
      .catch(() => {});
    const lost = () => setMe(null);
    const pw = () => setMe((m) => (m ? { ...m, user: { ...m.user, mustChangePassword: true } } : m));
    window.addEventListener("auth:lost", lost);
    window.addEventListener("auth:pwchange", pw);
    return () => {
      window.removeEventListener("auth:lost", lost);
      window.removeEventListener("auth:pwchange", pw);
    };
  }, []);

  const ownerEp = useMemo(() => ownerEndpoints(), []);
  const adminSite = match("/admin/t/:id/site", path) ?? match("/admin/t/:id/site/edit/:key", path) ?? match("/admin/t/:id/site/template", path);
  const adminEp = useMemo(() => (adminSite ? adminEndpoints(adminSite.id!) : null), [adminSite?.id]);

  if (me === undefined) return <Loading />;
  if (me === null) return <Login onDone={(m) => (setMe(m), go(m.user.role === "admin" ? "/admin" : "/"))} />;
  if (me.user.mustChangePassword) return <ChangePassword me={me} forced onDone={(m) => (setMe(m), go(m.user.role === "admin" ? "/admin" : "/"))} />;

  if (path === "/akun/password") return <ChangePassword me={me} forced={false} onDone={(m) => (setMe(m), go("/"))} />;

  if (me.user.role === "admin") {
    if (adminSite && adminEp) {
      const base = `/admin/t/${adminSite.id}/site`;
      return (
        <EditorProvider key={adminSite.id} ep={adminEp} base={base} isAdmin fallback={<Loading />}>
          <EditorRoutes path={path} base={base} homeHeader={<AdminSiteHeader id={adminSite.id!} />} />
        </EditorProvider>
      );
    }
    const t = match("/admin/t/:id", path);
    let page;
    if (t) page = <AdminTenant id={t.id!} />;
    else if (path === "/admin/new") page = <AdminNew />;
    else if (path === "/admin/hosting") page = <AdminHosting />;
    else {
      if (path !== "/admin") go("/admin");
      page = <AdminTenants />;
    }
    return (
      <AdminShell path={path} onLogout={logout}>
        {page}
      </AdminShell>
    );
  }

  if (path === "/akun") return <Account me={me} />;
  return (
    <EditorProvider ep={ownerEp} base="" isAdmin={false} fallback={<Loading />}>
      <EditorRoutes path={path} base="" homeHeader={<OwnerHeader />} />
    </EditorProvider>
  );
}

function Root() {
  return (
    <div class="app">
      <App />
      <ToastHost />
    </div>
  );
}

render(<Root />, document.getElementById("app")!);
