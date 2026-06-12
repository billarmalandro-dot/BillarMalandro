import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const { nombre, email, password, telefono } = body;

    if (!nombre || !email || !password) {
      return NextResponse.json({ error: "Nombre, email y contraseña son obligatorios." }, { status: 400 });
    }

    // 1. Create the user in Supabase Auth and auto-confirm email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Bypass email verification
      user_metadata: { name: nombre, telefono },
    });

    if (authError) {
      if (
        authError.message.includes("already registered") || 
        authError.message.includes("already been registered") ||
        authError.message.includes("already exists")
      ) {
        return NextResponse.json({ error: "El correo ya está registrado en el sistema. Por favor, inicia sesión." }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Create the client profile in the "clientes" table
    const { data: clientData, error: clientError } = await supabaseAdmin.from("clientes").insert({
      id_cliente: userId,
      auth_id: userId,
      nombre,
      email,
      telefono: telefono || null,
      activo: true,
    }).select();

    if (clientError) {
      // Rollback Auth user if DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: clientError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: clientData[0] }, { status: 200 });
  } catch (error: any) {
    console.error("Error creating client:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
