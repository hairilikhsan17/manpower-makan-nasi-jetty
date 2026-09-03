import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPER_ADMIN_EMAIL = "hairilikhsan11@gmail.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create a client with the caller's JWT to identify them
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the caller's session
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is super admin by querying profiles
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("email, role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError || !callerProfile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSuperAdmin =
      callerProfile.email === SUPER_ADMIN_EMAIL &&
      callerProfile.role === "super_admin";

    const body = await req.json();
    const action = body.action;

    // === CREATE ADMIN ===
    if (action === "create") {
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: "ACCESS_DENIED: Hanya Super Admin yang dapat menambahkan admin baru." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { email, password, nama } = body;
      if (!email || !password || !nama) {
        return new Response(JSON.stringify({ error: "Email, password, dan nama wajib diisi." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (password.length < 6) {
        return new Response(JSON.stringify({ error: "Password minimal 6 karakter." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user via Admin API
      const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert profile (trigger will also try, so use upsert)
      const { error: profileInsertError } = await adminClient
        .from("profiles")
        .upsert({
          id: newUserData.user.id,
          email: email.toLowerCase(),
          nama,
          role: "admin",
          status: "aktif",
        });

      if (profileInsertError) {
        return new Response(JSON.stringify({ error: "Gagal membuat profil: " + profileInsertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, id: newUserData.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === DELETE ADMIN ===
    if (action === "delete") {
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: "ACCESS_DENIED: Hanya Super Admin yang dapat menghapus admin." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { adminId } = body;
      if (!adminId) {
        return new Response(JSON.stringify({ error: "adminId wajib diisi." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check target is not super admin
      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("email")
        .eq("id", adminId)
        .maybeSingle();

      if (!targetProfile) {
        return new Response(JSON.stringify({ error: "Admin tidak ditemukan." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (targetProfile.email === SUPER_ADMIN_EMAIL) {
        return new Response(JSON.stringify({ error: "Super Admin tidak dapat dihapus." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(adminId);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === TOGGLE STATUS ===
    if (action === "toggle_status") {
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: "ACCESS_DENIED: Hanya Super Admin yang dapat mengubah status admin." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { adminId, status } = body;
      if (!adminId || !status) {
        return new Response(JSON.stringify({ error: "adminId dan status wajib diisi." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status !== "aktif" && status !== "nonaktif") {
        return new Response(JSON.stringify({ error: "Status harus aktif atau nonaktif." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check target is not super admin
      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("email")
        .eq("id", adminId)
        .maybeSingle();

      if (!targetProfile) {
        return new Response(JSON.stringify({ error: "Admin tidak ditemukan." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (targetProfile.email === SUPER_ADMIN_EMAIL) {
        return new Response(JSON.stringify({ error: "Status Super Admin tidak dapat diubah." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await adminClient
        .from("profiles")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", adminId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
