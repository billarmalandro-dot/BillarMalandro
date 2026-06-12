import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, email, password, id_rol, id_sucursal } = body;

    if (!nombre || !email || !id_rol) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const isDummyKey = !process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === "dummy-key";

    if (isDummyKey) {
      // Fallback: pre-registrar en base de datos sin Supabase Auth
      const { data: existingUser } = await supabaseAdmin.from("usuarios").select("id_usuario").eq("email", email).maybeSingle();
      if (existingUser) {
        return NextResponse.json({ error: "El correo ya está registrado en el sistema." }, { status: 400 });
      }

      const { data: userData, error: userError } = await supabaseAdmin.from("usuarios").insert({
        nombre,
        email,
        id_rol,
        activo: true,
        auth_id: null
      }).select();

      if (userError) {
        return NextResponse.json({ error: userError.message }, { status: 400 });
      }

      const userId = userData[0].id_usuario;

      if (id_sucursal) {
        await supabaseAdmin.from("usuario_sucursal").insert({
          id_usuario: userId,
          id_sucursal,
          id_rol,
        });
      }

      return NextResponse.json({ 
        success: true, 
        user: userData[0], 
        warning: "Falta configurar la clave secreta SUPABASE_SERVICE_ROLE_KEY en el servidor. El empleado fue registrado en la base de datos, pero no se pudo crear su contraseña. Pídele que se registre de forma pública en la web usando el correo '" + email + "' para vincular su cuenta."
      }, { status: 200 });
    }

    if (!password) {
      return NextResponse.json({ error: "La contraseña es obligatoria" }, { status: 400 });
    }

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: nombre },
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        return NextResponse.json({ error: "El correo ya está registrado en el sistema." }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Create the user in the "usuarios" table
    const { data: userData, error: userError } = await supabaseAdmin.from("usuarios").insert({
      id_usuario: userId,
      auth_id: userId,
      nombre,
      email,
      id_rol,
      activo: true,
    }).select();

    if (userError) {
      // Rollback Auth user if DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    // 3. Assign the sucursal if provided
    if (id_sucursal) {
      await supabaseAdmin.from("usuario_sucursal").insert({
        id_usuario: userId,
        id_sucursal,
        id_rol,
      });
    }

    return NextResponse.json({ success: true, user: userData[0] }, { status: 200 });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idUsuario = searchParams.get("id");

    if (!idUsuario) {
      return NextResponse.json({ error: "ID de usuario es requerido" }, { status: 400 });
    }

    // 1. Delete user from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(idUsuario);
    if (authError) {
      // It might happen that the user doesn't exist in auth, we continue to soft delete in DB just in case
      console.warn("Auth delete warning:", authError.message);
    }

    // 2. Mark the user as inactive in DB (Soft Delete)
    const { error: dbError } = await supabaseAdmin
      .from("usuarios")
      .update({ activo: false, deleted_at: new Date().toISOString() })
      .eq("id_usuario", idUsuario);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    // Update their sucursal assignments to inactive as well
    await supabaseAdmin
      .from("usuario_sucursal")
      .update({ activo: false, fecha_fin: new Date().toISOString() })
      .eq("id_usuario", idUsuario);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
