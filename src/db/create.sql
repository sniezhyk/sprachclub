-- =========================================================
-- Sprachclub-DB (Neuaufbau)
-- MySQL / MariaDB kompatibel
-- =========================================================

-- DB anlegen & auswählen
CREATE DATABASE IF NOT EXISTS sprachclubdb
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE sprachclubdb;

-- =========================================================
-- USERS (angepasst)
--  - display_name & locale entfernt
--  - first_name, last_name, birth_date ergänzt
-- =========================================================
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username       VARCHAR(32)      NOT NULL,
  email          VARCHAR(254)     NOT NULL,
  first_name     VARCHAR(80)      NOT NULL,
  last_name      VARCHAR(80)      NOT NULL,
  birth_date     DATE             NULL,          -- bei Bedarf später auf NOT NULL ziehen
  password_hash  VARBINARY(60)    NOT NULL,
  is_host        TINYINT(1)       NOT NULL DEFAULT 0,
  created_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_created_at (created_at),
  KEY idx_users_last_first (last_name, first_name)
) ENGINE=InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Optional: View für öffentlichen User-Output (anstelle display_name)
DROP VIEW IF EXISTS v_users_public;
CREATE VIEW v_users_public AS
SELECT
  u.id,
  u.username,
  u.email,
  CONCAT(u.first_name, ' ', u.last_name) AS full_name,
  u.birth_date,
  u.is_host,
  u.created_at,
  u.updated_at
FROM users u;

-- =========================================================
-- HOSTS (optionale Zusatzinfos für Hosts)
-- =========================================================
DROP TABLE IF EXISTS hosts;
CREATE TABLE hosts (
  user_id BIGINT UNSIGNED NOT NULL,
  bio     TEXT,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_hosts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =========================================================
-- LEVELS
-- =========================================================
DROP TABLE IF EXISTS levels;
CREATE TABLE levels (
  code  VARCHAR(10) NOT NULL,  -- z.B. A2.1, A2.2, A2/B1, B2/C1
  label VARCHAR(32) NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =========================================================
-- CLUBS
-- =========================================================
DROP TABLE IF EXISTS clubs;
CREATE TABLE clubs (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title         VARCHAR(120)    NOT NULL,
  description   TEXT,
  level_code    VARCHAR(10)     NOT NULL,       -- FK -> levels
  host_id       BIGINT UNSIGNED NOT NULL,       -- FK -> users (Host)
  starts_at     DATETIME        NOT NULL,       -- UTC empfohlen
  duration_min  SMALLINT UNSIGNED NOT NULL,     -- 30, 45, 60, ...
  capacity      SMALLINT UNSIGNED NOT NULL DEFAULT 12,
  meeting_url   VARCHAR(255),                   -- optional
  price_cents   INT UNSIGNED NOT NULL DEFAULT 0,
  currency      CHAR(3) NOT NULL DEFAULT 'EUR',
  status ENUM('SCHEDULED','CANCELED','COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_clubs_starts_at (starts_at),
  KEY idx_clubs_level (level_code),
  KEY idx_clubs_search (status, level_code, starts_at),
  CONSTRAINT fk_clubs_level
    FOREIGN KEY (level_code) REFERENCES levels(code)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_clubs_host
    FOREIGN KEY (host_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =========================================================
-- ENROLLMENTS
-- =========================================================
DROP TABLE IF EXISTS enrollments;
CREATE TABLE enrollments (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  club_id     BIGINT UNSIGNED NOT NULL,
  status ENUM('PENDING','CONFIRMED','CANCELLED','ATTENDED','NO_SHOW') NOT NULL DEFAULT 'CONFIRMED',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enrollments_user_club (user_id, club_id),
  KEY idx_enrollments_club (club_id),
  KEY idx_enrollments_club_status (club_id, status),
  CONSTRAINT fk_enr_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_enr_club
    FOREIGN KEY (club_id) REFERENCES clubs(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =========================================================
-- ENROLLMENT AUDIT
-- =========================================================
DROP TABLE IF EXISTS enrollment_audit;
CREATE TABLE enrollment_audit (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  enrollment_id BIGINT UNSIGNED NOT NULL,
  action        ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  old_status    VARCHAR(16),
  new_status    VARCHAR(16),
  changed_by    BIGINT UNSIGNED,  -- optional: Admin/User
  changed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_enrollment (enrollment_id),
  CONSTRAINT fk_audit_enrollment
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_audit_changed_by
    FOREIGN KEY (changed_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =========================================================
-- REVIEWS
-- =========================================================
DROP TABLE IF EXISTS reviews;
CREATE TABLE reviews (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  enrollment_id  BIGINT UNSIGNED NOT NULL,
  rating         TINYINT UNSIGNED NOT NULL,  -- 1..5 (Range in App/DB-Check validieren)
  comment        TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_enrollment (enrollment_id),
  CONSTRAINT fk_reviews_enrollment
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =========================================================
-- WISHLISTS
-- =========================================================
DROP TABLE IF EXISTS wishlists;
CREATE TABLE wishlists (
  user_id    BIGINT UNSIGNED NOT NULL,
  club_id    BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, club_id),
  KEY idx_wishlist_club (club_id),
  CONSTRAINT fk_wish_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_wish_club FOREIGN KEY (club_id) REFERENCES clubs(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =========================================================
-- VIEW: Auslastung (nur CONFIRMED)
-- =========================================================
DROP VIEW IF EXISTS v_club_fillrate;
CREATE VIEW v_club_fillrate AS
SELECT
  c.id,
  c.title,
  c.level_code,
  c.capacity,
  SUM(CASE WHEN e.status='CONFIRMED' THEN 1 ELSE 0 END) AS confirmed_count,
  ROUND(SUM(CASE WHEN e.status='CONFIRMED' THEN 1 ELSE 0 END) / NULLIF(c.capacity,0), 2) AS fill_rate
FROM clubs c
LEFT JOIN enrollments e ON e.club_id = c.id
GROUP BY c.id, c.title, c.level_code, c.capacity;

-- =========================================================
-- STORED PROCEDURE
-- =========================================================
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_get_clubs_by_level $$
CREATE PROCEDURE sp_get_clubs_by_level(IN in_level VARCHAR(10))
BEGIN
  SELECT c.*
  FROM clubs c
  WHERE c.level_code = in_level
    AND c.status = 'SCHEDULED'
  ORDER BY c.starts_at ASC;
END $$
DELIMITER ;

-- =========================================================
-- TRIGGER: Users (Geburtsdatum-Validierung)
--  - kein Datum in der Zukunft
--  - Mindestalter 13 Jahre (nur wenn birth_date gesetzt ist)
-- =========================================================
DELIMITER $$

DROP TRIGGER IF EXISTS trg_users_birthdate_ins $$
CREATE TRIGGER trg_users_birthdate_ins
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  IF NEW.birth_date IS NOT NULL THEN
    IF NEW.birth_date > CURRENT_DATE() THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'birth_date darf nicht in der Zukunft liegen.';
    END IF;
    IF TIMESTAMPDIFF(YEAR, NEW.birth_date, CURRENT_DATE()) < 13 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mindestalter 13 Jahre.';
    END IF;
  END IF;
END $$

DROP TRIGGER IF EXISTS trg_users_birthdate_upd $$
CREATE TRIGGER trg_users_birthdate_upd
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
  IF NEW.birth_date IS NOT NULL THEN
    IF NEW.birth_date > CURRENT_DATE() THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'birth_date darf nicht in der Zukunft liegen.';
    END IF;
    IF TIMESTAMPDIFF(YEAR, NEW.birth_date, CURRENT_DATE()) < 13 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mindestalter 13 Jahre.';
    END IF;
  END IF;
END $$

-- =========================================================
-- TRIGGER: Enrollments (Audit & Kapazität)
-- =========================================================

-- Audit: INSERT
DROP TRIGGER IF EXISTS trg_enrollment_insert_audit $$
CREATE TRIGGER trg_enrollment_insert_audit
AFTER INSERT ON enrollments
FOR EACH ROW
BEGIN
  INSERT INTO enrollment_audit (enrollment_id, action, new_status, changed_by)
  VALUES (NEW.id, 'INSERT', NEW.status, NEW.user_id);
END $$

-- Audit: UPDATE (Statuswechsel)
DROP TRIGGER IF EXISTS trg_enrollment_update_audit $$
CREATE TRIGGER trg_enrollment_update_audit
AFTER UPDATE ON enrollments
FOR EACH ROW
BEGIN
  IF (OLD.status <> NEW.status) THEN
    INSERT INTO enrollment_audit (enrollment_id, action, old_status, new_status, changed_by)
    VALUES (NEW.id, 'UPDATE', OLD.status, NEW.status, NEW.user_id);
  END IF;
END $$

-- Audit: DELETE
DROP TRIGGER IF EXISTS trg_enrollment_delete_audit $$
CREATE TRIGGER trg_enrollment_delete_audit
AFTER DELETE ON enrollments
FOR EACH ROW
BEGIN
  INSERT INTO enrollment_audit (enrollment_id, action, old_status, changed_by)
  VALUES (OLD.id, 'DELETE', OLD.status, OLD.user_id);
END $$

-- Kapazität prüfen bei INSERT (belegte Plätze: PENDING/CONFIRMED/ATTENDED)
DROP TRIGGER IF EXISTS trg_enrollment_capacity_check_ins $$
CREATE TRIGGER trg_enrollment_capacity_check_ins
BEFORE INSERT ON enrollments
FOR EACH ROW
BEGIN
  DECLARE v_capacity INT UNSIGNED;
  DECLARE v_taken INT UNSIGNED;

  IF NEW.status IN ('PENDING','CONFIRMED','ATTENDED') THEN
    SELECT capacity INTO v_capacity FROM clubs WHERE id = NEW.club_id;

    SELECT COUNT(*) INTO v_taken
    FROM enrollments
    WHERE club_id = NEW.club_id
      AND status IN ('PENDING','CONFIRMED','ATTENDED');

    IF v_taken >= v_capacity THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Dieser Sprachclub ist bereits voll.';
    END IF;
  END IF;
END $$

-- Kapazität prüfen bei UPDATE (z.B. CANCELLED -> CONFIRMED)
DROP TRIGGER IF EXISTS trg_enrollment_capacity_check_upd $$
CREATE TRIGGER trg_enrollment_capacity_check_upd
BEFORE UPDATE ON enrollments
FOR EACH ROW
BEGIN
  DECLARE v_capacity INT UNSIGNED;
  DECLARE v_taken INT UNSIGNED;

  IF (OLD.status NOT IN ('PENDING','CONFIRMED','ATTENDED'))
     AND (NEW.status IN ('PENDING','CONFIRMED','ATTENDED')) THEN

    SELECT capacity INTO v_capacity FROM clubs WHERE id = NEW.club_id;

    SELECT COUNT(*) INTO v_taken
    FROM enrollments
    WHERE club_id = NEW.club_id
      AND status IN ('PENDING','CONFIRMED','ATTENDED');

    IF v_taken >= v_capacity THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Dieser Sprachclub ist bereits voll.';
    END IF;
  END IF;
END $$

DELIMITER ;

-- =========================================================
-- Ende
-- =========================================================








