"use client";

import { useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import BudgetCard from "./BudgetCard";
import styles from "./BudgetSlider.module.css";

export default function BudgetSlider({ budgets, onCardClick, selectedCardIndex }) {
  const swiperRef = useRef(null);

  return (
    <div className={styles.sliderContainer}>
      <Swiper
        ref={swiperRef}
        modules={[Navigation, Pagination]}
        spaceBetween={20}
        slidesPerView={1}
        breakpoints={{
          769: {
            slidesPerView: 3,
            spaceBetween: 20,
          },
        }}
        pagination={{
          clickable: true,
        }}
        className={styles.swiper}
      >
        {budgets.map((budget, index) => (
          <SwiperSlide key={index} className={styles.swiperSlide}>
            <BudgetCard 
              {...budget} 
              onClick={() => onCardClick && onCardClick(index)}
              isSelected={selectedCardIndex === index}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
