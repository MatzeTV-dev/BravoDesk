-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 25, 2024 at 06:23 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `customer_server_information_production`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `ActivateKey` (IN `input_key` VARCHAR(35), IN `discord_server_id` VARCHAR(35))   BEGIN
    INSERT INTO server_activations (activation_key, activation_date, sup_duration, discord_server_id)
    VALUES (input_key, CURDATE(), '30', discord_server_id);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `CheckDiscordIDWithKey` (IN `input_key` VARCHAR(15), IN `input_discord_id` VARCHAR(35), OUT `is_match` BOOLEAN)   BEGIN
    DECLARE discord_id_in_db VARCHAR(35);

    -- Initialisiere die Rückgabevariable
    SET is_match = FALSE;

    -- Hole die Discord Server ID aus der server_activations Tabelle basierend auf dem Key
    SELECT discord_server_id INTO discord_id_in_db
    FROM server_activations
    WHERE activation_key = input_key
    LIMIT 1;

    -- Überprüfe, ob die Discord ID übereinstimmt
    IF discord_id_in_db = input_discord_id THEN
        SET is_match = TRUE;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `CheckKeyActivated` (IN `input_key` VARCHAR(15), OUT `is_activated` BOOLEAN)   BEGIN
    DECLARE activation_count INT;

    -- Initialisiere den Rückgabewert
    SET is_activated = FALSE;

    -- Überprüfen, ob der Schlüssel in server_activations existiert
    SELECT COUNT(*) INTO activation_count
    FROM server_activations
    WHERE activation_key = input_key;

    IF activation_count > 0 THEN
        SET is_activated = TRUE;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `CheckKeyExists` (IN `input_key` VARCHAR(15), OUT `exists_in_keys` BOOLEAN)   BEGIN
    DECLARE activation_count INT;

    -- Initialisiere den Rückgabewert
    SET exists_in_keys = FALSE;

    -- Überprüfen, ob der Schlüssel in activation_keys existiert
    SELECT COUNT(*) INTO activation_count
    FROM activation_keys
    WHERE activation_key = input_key;

    IF activation_count > 0 THEN
        SET exists_in_keys = TRUE;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `CheckKeyValidity` (IN `in_input_key` VARCHAR(15), OUT `is_valid` INT)   BEGIN
    DECLARE activation_dateTwo DATE;
    DECLARE expiry_date DATE;
    DECLARE duration_days INT;

    -- Initialisiere den Rückgabewert
    SET is_valid = 0;

    -- Hole die Dauer in Tagen
    SELECT CAST(sup_duration AS UNSIGNED)
    INTO duration_days
    FROM server_activations
    WHERE activation_key = in_input_key
    ORDER BY activation_date DESC
    LIMIT 1;

    -- Hole das Aktivierungsdatum für den gegebenen Schlüssel
    SELECT activation_date 
    INTO activation_dateTwo 
    FROM server_activations 
    WHERE activation_key = in_input_key
    ORDER BY activation_date DESC
    LIMIT 1;

    -- Debug-Informationen (optional, kann entfernt werden)
    SELECT 'Debug info' AS debug_label,
           activation_dateTwo AS debug_activation_date,
           duration_days AS debug_duration_days,
           DATE_ADD(activation_dateTwo, INTERVAL duration_days DAY) AS debug_expiry_date,
           CURDATE() AS debug_current_date;

    -- Überprüfe die Gültigkeit des Schlüssels
    IF activation_dateTwo IS NOT NULL THEN
        SET expiry_date = DATE_ADD(activation_dateTwo, INTERVAL duration_days DAY);
        IF CURDATE() <= expiry_date THEN
            SET is_valid = 1;
        ELSE
            SET is_valid = 0;
        END IF;
    ELSE
        SET is_valid = 0;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `Check_If_Server_Exists` (IN `guild_id` VARCHAR(35), OUT `exists_flag` BOOLEAN)   IF (SELECT 1 FROM server_information WHERE discord_server_id = guild_id) THEN
        SET exists_flag = FALSE;
    ELSE
        SET exists_flag = TRUE;
END IF$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `Delete_Server_Information` (IN `guildID` VARCHAR(35))   DELETE FROM server_information WHERE discord_server_id = guildID$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `Get_Server_Information` (IN `discord_server_id_IN` VARCHAR(35))   SELECT * FROM server_information WHERE discord_server_id = discord_server_id_IN$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `Save_Server_Information` (IN `discord_server_id_IN` VARCHAR(35), IN `ticket_system_channel_id_IN` VARCHAR(35), IN `ticket_category_id_IN` VARCHAR(35), IN `support_role_id_IN` VARCHAR(35), IN `kiadmin_role_id_IN` VARCHAR(35))   INSERT INTO server_information (discord_server_id, ticket_system_channel_id, ticket_category_id,support_role_id,  	kiadmin_role_id )
VALUES (discord_server_id_IN,ticket_system_channel_id_IN, ticket_category_id_IN, support_role_id_IN, 	kiadmin_role_id_IN)$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `activation_keys`
--

CREATE TABLE `activation_keys` (
  `ID` int(11) NOT NULL,
  `activation_key` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activation_keys`
--

INSERT INTO `activation_keys` (`ID`, `activation_key`) VALUES
(0, ''),
(1, '1234');

-- --------------------------------------------------------

--
-- Table structure for table `server_activations`
--

CREATE TABLE `server_activations` (
  `ID` int(11) NOT NULL,
  `activation_key` varchar(15) NOT NULL,
  `activation_date` date NOT NULL,
  `sup_duration` varchar(3) NOT NULL,
  `discord_server_id` varchar(35) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `server_activations`
--

INSERT INTO `server_activations` (`ID`, `activation_key`, `activation_date`, `sup_duration`, `discord_server_id`) VALUES
(1, '1234', '2024-12-13', '30', '1308408725236744314');

-- --------------------------------------------------------

--
-- Table structure for table `server_information`
--

CREATE TABLE `server_information` (
  `ID` int(11) NOT NULL,
  `discord_server_id` varchar(35) NOT NULL,
  `ticket_system_channel_id` varchar(35) NOT NULL,
  `ticket_category_id` varchar(35) NOT NULL,
  `support_role_id` varchar(35) NOT NULL,
  `kiadmin_role_id` varchar(35) NOT NULL,
  `hex_color` varchar(7) NOT NULL DEFAULT '#6B8F71'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activation_keys`
--
ALTER TABLE `activation_keys`
  ADD PRIMARY KEY (`ID`);

--
-- Indexes for table `server_activations`
--
ALTER TABLE `server_activations`
  ADD PRIMARY KEY (`ID`);

--
-- Indexes for table `server_information`
--
ALTER TABLE `server_information`
  ADD PRIMARY KEY (`ID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activation_keys`
--
ALTER TABLE `activation_keys`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=754751477;

--
-- AUTO_INCREMENT for table `server_activations`
--
ALTER TABLE `server_activations`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `server_information`
--
ALTER TABLE `server_information`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=66;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
