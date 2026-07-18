-- Create database if not exists
CREATE DATABASE IF NOT EXISTS ganesh_transport;
USE ganesh_transport;

-- Disable foreign key checks temporarily to drop tables in any order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS maintenance_entries;
DROP TABLE IF EXISTS diesel_entries;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS shift_routes;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS buses;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users Table (Authentication and Authorization)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NULL,
    mobile VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'officeStaff', 'driver') NOT NULL,
    status TINYINT DEFAULT 1 COMMENT '1: Active, 0: Inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Buses Table
CREATE TABLE buses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    number VARCHAR(50) UNIQUE NOT NULL,
    model VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    insurance_expiry DATE NOT NULL,
    fitness_expiry DATE NOT NULL,
    permit_expiry DATE NOT NULL,
    puc_expiry DATE NOT NULL,
    status TINYINT DEFAULT 1 COMMENT '1: Active, 0: Deleted/Inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Drivers Table
CREATE TABLE drivers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) UNIQUE NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    assigned_bus_id INT NULL COMMENT 'References buses(id)',
    monthly_salary DECIMAL(10,2) NOT NULL,
    status TINYINT DEFAULT 1 COMMENT '1: Active, 0: Deleted/Inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_driver_bus FOREIGN KEY (assigned_bus_id) REFERENCES buses(id) ON DELETE SET NULL
);

-- 4. Companies Table
CREATE TABLE companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    billing_type ENUM('Per Trip', 'Monthly') NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    status TINYINT DEFAULT 1 COMMENT '1: Active, 0: Deleted/Inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. Shift Routes Table
CREATE TABLE shift_routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    route_name VARCHAR(255) NOT NULL,
    start_time VARCHAR(20) NOT NULL, -- e.g., '07:35 AM'
    end_time VARCHAR(20) NOT NULL, -- e.g., '06:00 PM'
    status TINYINT DEFAULT 1 COMMENT '1: Active, 0: Deleted/Inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_route_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 6. Attendance Table
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL,
    bus_id INT NOT NULL,
    shift_route_id INT NOT NULL,
    call_time DATETIME NOT NULL,
    status ENUM('Present', 'Late', 'Absent') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_attendance_driver FOREIGN KEY (driver_id) REFERENCES drivers(id),
    CONSTRAINT fk_attendance_bus FOREIGN KEY (bus_id) REFERENCES buses(id),
    CONSTRAINT fk_attendance_route FOREIGN KEY (shift_route_id) REFERENCES shift_routes(id)
);

-- 7. Trips Table
CREATE TABLE trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    company_id INT NOT NULL,
    shift_route_id INT NOT NULL,
    bus_id INT NOT NULL,
    driver_id INT NOT NULL,
    kilometers DECIMAL(8,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_trip_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_trip_route FOREIGN KEY (shift_route_id) REFERENCES shift_routes(id),
    CONSTRAINT fk_trip_bus FOREIGN KEY (bus_id) REFERENCES buses(id),
    CONSTRAINT fk_trip_driver FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

-- 8. Diesel Entries Table
CREATE TABLE diesel_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    bus_id INT NOT NULL,
    litres DECIMAL(8,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    odometer INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_diesel_bus FOREIGN KEY (bus_id) REFERENCES buses(id)
);

-- 9. Maintenance Entries Table
CREATE TABLE maintenance_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    bus_id INT NOT NULL,
    work_type VARCHAR(255) NOT NULL,
    description TEXT NULL,
    cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_maintenance_bus FOREIGN KEY (bus_id) REFERENCES buses(id)
);

-- 10. Audit Log / History Tracking Table
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL COMMENT 'User who performed the action',
    action ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
    entity_type VARCHAR(100) NOT NULL COMMENT 'Table Name or Entity (e.g. buses, drivers)',
    entity_id INT NOT NULL COMMENT 'ID of the changed record',
    old_values JSON NULL COMMENT 'Data before changes (for UPDATE/DELETE)',
    new_values JSON NULL COMMENT 'Data after changes (for CREATE/UPDATE)',
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ==========================================
-- SEED DATA
-- ==========================================

-- Seed Users (admin -> admin123, staff -> staff123, drivers -> driver123)
INSERT INTO users (id, name, email, mobile, password_hash, role, status) VALUES
(1, 'System Admin', 'admin@ganeshtransport.com', '9000000000', '$2a$10$QmbsaXsxAlUcItIu..c2Cuo0.qah6EhXQwYZVEpVhMbvMBeLQhYP.', 'admin', 1),
(2, 'Office Staff User', 'staff@ganeshtransport.com', '9000000008', '$2a$10$mvofNIqtRs8s7vrWhWmpcOWGs6ERTo0tpxKw2HsnE78G1SShlMSry', 'officeStaff', 1),
(3, 'Regular Driver', 'driver1@ganeshtransport.com', '9000000001', '$2a$10$19KiCFhxjEH8byVKgAkQj.ALgsfUiNKwM8K0LLrW4B1ukJmtDpoAO', 'driver', 1),
(4, 'Second Driver', 'driver2@ganeshtransport.com', '9000000002', '$2a$10$19KiCFhxjEH8byVKgAkQj.ALgsfUiNKwM8K0LLrW4B1ukJmtDpoAO', 'driver', 1);

-- Seed Buses
INSERT INTO buses (id, number, model, capacity, insurance_expiry, fitness_expiry, permit_expiry, puc_expiry, status) VALUES
(1, 'MH20GC9853', 'Company Bus', 32, '2027-01-13', '2027-06-01', '2027-05-10', '2026-12-31', 1),
(2, 'MH20GT9853', 'Staff Bus', 50, '2026-10-15', '2026-11-20', '2027-02-05', '2026-08-30', 1);

-- Seed Drivers
INSERT INTO drivers (id, name, mobile, license_number, license_expiry, assigned_bus_id, monthly_salary, status) VALUES
(1, 'Regular Driver', '9000000001', 'MH-LIC-001', '2028-04-01', 1, 22000.00, 1),
(2, 'Second Driver', '9000000002', 'MH-LIC-002', '2027-12-01', 2, 21000.00, 1);

-- Seed Companies
INSERT INTO companies (id, name, contact_person, mobile, billing_type, rate, status) VALUES
(1, 'Compo Advics (India) Pvt. Ltd.', 'Transport/Admin', 'Not Added', 'Per Trip', 1300.00, 1),
(2, 'Akar Auto Industries Ltd.', 'HR/Admin', 'Not Added', 'Monthly', 100000.00, 1);

-- Seed Shift Routes
INSERT INTO shift_routes (id, company_id, shift_name, route_name, start_time, end_time, status) VALUES
(1, 1, 'General', 'Waluj MIDC Route', '07:35 AM', '06:00 PM', 1),
(2, 1, '1st Shift', 'City Route', '06:00 AM', '02:00 PM', 1),
(3, 1, '2nd Shift', 'City Route', '02:00 PM', '10:00 PM', 1),
(4, 1, '3rd Shift', 'City Route', '10:00 PM', '06:00 AM', 1);

-- Seed Attendance
INSERT INTO attendance (id, driver_id, bus_id, shift_route_id, call_time, status) VALUES
(1, 1, 1, 1, '2026-07-03 07:00:00', 'Present'),
(2, 2, 2, 2, '2026-07-03 06:08:00', 'Late');

-- Seed Trips
INSERT INTO trips (id, date, company_id, shift_route_id, bus_id, driver_id, kilometers, amount) VALUES
(1, '2026-07-03', 1, 1, 1, 1, 60.00, 1300.00);

-- Seed Diesel
INSERT INTO diesel_entries (id, date, bus_id, litres, amount, odometer) VALUES
(1, '2026-07-03', 1, 45.00, 4300.00, 125430);

-- Seed Maintenance
INSERT INTO maintenance_entries (id, date, bus_id, work_type, description, cost) VALUES
(1, '2026-07-02', 1, 'Oil Change', 'Engine oil and filter changed', 5500.00);
