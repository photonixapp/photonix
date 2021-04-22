import { useEffect, useState, useRef } from 'react'

// Custom infiniteScroll to detect if the user reached the bottom of the page.
function useInfiniteScroll(reFetchPhoto) {
    const elementRef = useRef();
    const [isBottom, setIsBottom] = useState(false);

    useEffect(() => {
      async function loadItems() {
        reFetchPhoto()
      }
      if(isBottom) {
        loadItems();
        setIsBottom(false);
      }
    }, [isBottom, reFetchPhoto]);
  
    const handleScroll = () => {
      const scroller = elementRef.current;
      if (scroller.scrollHeight - scroller.scrollTop === scroller.clientHeight) {
        setIsBottom(true);
      }
    }
    return [elementRef, handleScroll];
  }

  export default useInfiniteScroll;
