-- =============================================
-- LAB RESERVATIONS - SUPABASE SETUP SCRIPT
-- Run this entire script in the Supabase SQL Editor
-- =============================================

-- 1. PROFILES TABLE (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'approver', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EQUIPMENT TABLE
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_tag TEXT UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  floor_building TEXT,
  category TEXT,
  training_required BOOLEAN DEFAULT false,
  approval_required BOOLEAN DEFAULT false,
  owner TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  booking_type TEXT DEFAULT 'time_slot' CHECK (booking_type IN ('time_slot', 'half_day', 'full_day', 'multi_day')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    'viewer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, only update their own
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Equipment: authenticated users can read active equipment
CREATE POLICY "Anyone authenticated can view active equipment" ON public.equipment FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can insert equipment" ON public.equipment FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update equipment" ON public.equipment FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Bookings: users see their own, admins/approvers see all
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'approver'))
);
CREATE POLICY "Users can insert bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel own bookings" ON public.bookings FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'approver'))
);

-- 6. INDEXES FOR PERFORMANCE (important with 1000+ equipment)
CREATE INDEX IF NOT EXISTS idx_equipment_name ON public.equipment(name);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON public.equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_floor ON public.equipment(floor_building);
CREATE INDEX IF NOT EXISTS idx_equipment_active ON public.equipment(is_active);
CREATE INDEX IF NOT EXISTS idx_bookings_equipment ON public.bookings(equipment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON public.bookings(start_time);

-- 7. MAKE YOURSELF ADMIN
-- After you register your account, run this with YOUR email:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'youremail@lilly.com';

