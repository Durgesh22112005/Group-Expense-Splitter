package com.groupexpensesplitter.repository;

import com.groupexpensesplitter.entity.Participant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParticipantRepository extends JpaRepository<Participant, Long> {

    List<Participant> findByEventId(Long eventId);

    Optional<Participant> findByIdAndEventId(Long id, Long eventId);

    boolean existsByIdAndEventId(Long id, Long eventId);
}
