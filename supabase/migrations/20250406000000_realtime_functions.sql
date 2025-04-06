
-- Create function to set replica identity to FULL for a table
CREATE OR REPLACE FUNCTION public.alter_table_replica_identity(
  table_name text,
  replica_type text DEFAULT 'FULL'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'ALTER TABLE %I REPLICA IDENTITY %s;',
    table_name,
    replica_type
  );
END;
$$;

-- Create function to add a table to a publication
CREATE OR REPLACE FUNCTION public.add_table_to_publication(
  table_name text,
  publication_name text DEFAULT 'supabase_realtime'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'ALTER PUBLICATION %I ADD TABLE %I;',
    publication_name,
    table_name
  );
END;
$$;
